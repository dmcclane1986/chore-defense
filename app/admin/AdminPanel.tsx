'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import type { Bounty, BountyFrequency, Faction, MarketItem, CombatLogEntry } from '@/types'
import { FREQUENCY_ICON, FREQUENCY_LABEL } from '@/lib/bounties'
import { DAY_NAMES, DAY_LABELS } from '@/lib/market'
import { US_TIMEZONES } from '@/lib/timezone'

type Tab = 'chores' | 'market' | 'chronicles' | 'war'

type Props = {
  bounties: Bounty[]
  factions: Faction[]
  marketItems: MarketItem[]
  combatLog: CombatLogEntry[]
  timezone: string
}

// ---------------------------------------------------------------------------
// Chores Tab
// ---------------------------------------------------------------------------

function ChoresTab({
  initialBounties,
}: {
  initialBounties: Bounty[]
}) {
  const supabase = getSupabaseBrowser()
  const [bounties, setBounties] = useState<Bounty[]>(initialBounties)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Bounty>>({})

  const [form, setForm] = useState({
    title: '',
    description: '',
    frequency: 'daily' as BountyFrequency,
    gold_reward: 15,
    xp_reward: 10,
    quest_type: 'Strike' as 'Strike' | 'Fortify' | 'Guild',
    power: 10,
    guild_double_gold: false,
  })

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(null), 3500)
  }

  async function refresh() {
    const { data } = await supabase
      .from('bounties')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setBounties(data as Bounty[])
  }

  async function createBounty() {
    setLoading(true)
    const { error } = await supabase.from('bounties').insert({
      ...form,
      is_completed: false,
    })
    if (error) {
      flash(`Error: ${error.message}`)
    } else {
      flash('Bounty created!')
      await refresh()
      setForm({
        title: '',
        description: '',
        frequency: 'daily',
        gold_reward: 15,
        xp_reward: 10,
        quest_type: 'Strike',
        power: 10,
        guild_double_gold: false,
      })
    }
    setLoading(false)
  }

  function startEdit(b: Bounty) {
    setEditingId(b.id)
    setEditForm({
      title: b.title,
      description: b.description ?? '',
      frequency: b.frequency ?? 'daily',
      gold_reward: b.gold_reward,
      xp_reward: b.xp_reward,
      quest_type: b.quest_type,
      power: b.power,
      guild_double_gold: b.guild_double_gold,
    })
  }

  async function saveEdit(id: string) {
    setLoading(true)
    const { error } = await supabase.from('bounties').update(editForm).eq('id', id)
    if (error) {
      flash(`Error: ${error.message}`)
    } else {
      flash('Bounty updated!')
      setEditingId(null)
      await refresh()
    }
    setLoading(false)
  }

  async function restoreBounty(id: string) {
    setLoading(true)
    const res = await fetch('/api/admin/restore-bounty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bountyId: id }),
    })
    const data = await res.json()
    if (data.ok) {
      flash('Chore restored to board!')
    } else {
      flash(`Error: ${data.error}`)
    }
    await refresh()
    setLoading(false)
  }

  async function deleteBounty(id: string) {
    await supabase.from('bounties').delete().eq('id', id)
    setBounties((prev) => prev.filter((b) => b.id !== id))
  }

  const active = bounties.filter((b) => !b.is_completed)
  const completed = bounties.filter((b) => b.is_completed)

  return (
    <div className="space-y-6">
      {msg && (
        <div className="bg-amber-900/40 border border-amber-600 rounded-lg px-4 py-3 text-amber-200 text-sm">
          {msg}
        </div>
      )}

      {/* Create form */}
      <section className="panel space-y-4">
        <h2 className="text-lg text-amber-200 font-bold">Create Chore</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="input w-full"
              placeholder="Vanquish the Dish Dragon"
            />
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="input w-full h-16 resize-none"
              placeholder="Optional flavor text…"
            />
          </div>
          <div>
            <label className="label">Frequency</label>
            <select
              value={form.frequency}
              onChange={(e) =>
                setForm((f) => ({ ...f, frequency: e.target.value as BountyFrequency }))
              }
              className="input w-full"
            >
              <option value="daily">☀️ Daily (always shown)</option>
              <option value="weekly">📅 Weekly (rotates weekly)</option>
              <option value="semi_weekly">🔄 Twice a Week (rotates every 3 days)</option>
              <option value="bi_weekly">🌙 Every Two Weeks (rotates bi-weekly)</option>
            </select>
          </div>
          <div>
            <label className="label">Combat Effect</label>
            <select
              value={form.quest_type}
              onChange={(e) =>
                setForm((f) => ({ ...f, quest_type: e.target.value as typeof form.quest_type }))
              }
              className="input w-full"
            >
              <option value="Strike">⚔️ Strike (Attack)</option>
              <option value="Fortify">🛡️ Fortify (Heal)</option>
              <option value="Guild">🏰 Guild (Both)</option>
            </select>
          </div>
          <div>
            <label className="label">Power</label>
            <input
              type="number"
              value={form.power}
              min={1}
              onChange={(e) => setForm((f) => ({ ...f, power: Number(e.target.value) }))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="label">Gold Reward</label>
            <input
              type="number"
              value={form.gold_reward}
              min={0}
              onChange={(e) => setForm((f) => ({ ...f, gold_reward: Number(e.target.value) }))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="label">XP Reward</label>
            <input
              type="number"
              value={form.xp_reward}
              min={0}
              onChange={(e) => setForm((f) => ({ ...f, xp_reward: Number(e.target.value) }))}
              className="input w-full"
            />
          </div>
          {form.quest_type === 'Guild' && (
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="newDoubleGold"
                checked={form.guild_double_gold}
                onChange={(e) => setForm((f) => ({ ...f, guild_double_gold: e.target.checked }))}
                className="w-4 h-4"
              />
              <label htmlFor="newDoubleGold" className="text-sm text-stone-300">
                Double Gold on completion
              </label>
            </div>
          )}
        </div>
        <button
          onClick={createBounty}
          disabled={!form.title || loading}
          className="btn-primary"
        >
          {loading ? 'Creating…' : '+ Create Chore'}
        </button>
      </section>

      {/* Active bounties */}
      <section className="panel space-y-3">
        <h2 className="text-lg text-amber-200 font-bold">
          Active Chores <span className="text-stone-500 font-normal text-sm">({active.length})</span>
        </h2>
        <div className="space-y-2">
          {active.length === 0 && (
            <p className="text-stone-500 text-sm italic text-center py-4">No active chores.</p>
          )}
          {active.map((b) =>
            editingId === b.id ? (
              <BountyEditRow
                key={b.id}
                bounty={b}
                editForm={editForm}
                setEditForm={setEditForm}
                onSave={() => saveEdit(b.id)}
                onCancel={() => setEditingId(null)}
                loading={loading}
              />
            ) : (
              <BountyRow
                key={b.id}
                bounty={b}
                onEdit={() => startEdit(b)}
                onDelete={() => deleteBounty(b.id)}
              />
            )
          )}
        </div>
      </section>

      {/* Completed bounties */}
      {completed.length > 0 && (
        <section className="panel space-y-3">
          <h2 className="text-lg text-amber-200 font-bold">
            Completed <span className="text-stone-500 font-normal text-sm">({completed.length})</span>
          </h2>
          <div className="space-y-2">
            {completed.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-stone-700 opacity-60 text-sm"
              >
                <span>{FREQUENCY_ICON[b.frequency ?? 'daily']}</span>
                <span className="flex-1 truncate">{b.title}</span>
                <span className="text-stone-500 text-xs">{b.power}pw</span>
                <button
                  onClick={() => restoreBounty(b.id)}
                  className="text-xs text-amber-500 hover:text-amber-400 touch-manipulation"
                >
                  Restore
                </button>
                <button
                  onClick={() => deleteBounty(b.id)}
                  className="text-xs text-red-500 hover:text-red-400 touch-manipulation"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function BountyRow({
  bounty: b,
  onEdit,
  onDelete,
}: {
  bounty: Bounty
  onEdit: () => void
  onDelete: () => void
}) {
  const freqIcon = FREQUENCY_ICON[b.frequency ?? 'daily']
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-stone-600 text-sm">
      <span title={FREQUENCY_LABEL[b.frequency ?? 'daily']}>{freqIcon}</span>
      <span className="flex-1 truncate text-stone-200">{b.title}</span>
      <span className="text-stone-500 text-xs shrink-0">
        {b.quest_type === 'Strike' ? '⚔️' : b.quest_type === 'Fortify' ? '🛡️' : '🏰'}
      </span>
      <span className="text-stone-500 text-xs shrink-0">{b.power}pw</span>
      <span className="text-xs text-amber-400 shrink-0">{b.gold_reward}g</span>
      <span className="text-xs text-purple-400 shrink-0">{b.xp_reward}xp</span>
      <button onClick={onEdit} className="text-xs text-sky-400 hover:text-sky-300 touch-manipulation shrink-0">
        Edit
      </button>
      <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-400 touch-manipulation shrink-0">
        Delete
      </button>
    </div>
  )
}

function BountyEditRow({
  bounty: b,
  editForm,
  setEditForm,
  onSave,
  onCancel,
  loading,
}: {
  bounty: Bounty
  editForm: Partial<Bounty>
  setEditForm: React.Dispatch<React.SetStateAction<Partial<Bounty>>>
  onSave: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="rounded-lg border border-sky-700 bg-sky-950/20 p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="label">Title</label>
          <input
            value={editForm.title ?? ''}
            onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
            className="input w-full"
          />
        </div>
        <div className="col-span-2">
          <label className="label">Description</label>
          <textarea
            value={editForm.description ?? ''}
            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
            className="input w-full h-12 resize-none"
          />
        </div>
        <div>
          <label className="label">Frequency</label>
          <select
            value={editForm.frequency ?? b.frequency ?? 'daily'}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, frequency: e.target.value as BountyFrequency }))
            }
            className="input w-full"
          >
            <option value="daily">☀️ Daily</option>
            <option value="weekly">📅 Weekly</option>
            <option value="semi_weekly">🔄 Twice a Week</option>
            <option value="bi_weekly">🌙 Every Two Weeks</option>
          </select>
        </div>
        <div>
          <label className="label">Combat Effect</label>
          <select
            value={editForm.quest_type ?? b.quest_type}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, quest_type: e.target.value as Bounty['quest_type'] }))
            }
            className="input w-full"
          >
            <option value="Strike">⚔️ Strike</option>
            <option value="Fortify">🛡️ Fortify</option>
            <option value="Guild">🏰 Guild</option>
          </select>
        </div>
        <div>
          <label className="label">Power</label>
          <input
            type="number"
            value={editForm.power ?? b.power}
            min={1}
            onChange={(e) => setEditForm((f) => ({ ...f, power: Number(e.target.value) }))}
            className="input w-full"
          />
        </div>
        <div>
          <label className="label">Gold</label>
          <input
            type="number"
            value={editForm.gold_reward ?? b.gold_reward}
            min={0}
            onChange={(e) => setEditForm((f) => ({ ...f, gold_reward: Number(e.target.value) }))}
            className="input w-full"
          />
        </div>
        <div>
          <label className="label">XP</label>
          <input
            type="number"
            value={editForm.xp_reward ?? b.xp_reward}
            min={0}
            onChange={(e) => setEditForm((f) => ({ ...f, xp_reward: Number(e.target.value) }))}
            className="input w-full"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} disabled={loading} className="btn-primary text-xs py-1.5 px-4">
          Save
        </button>
        <button onClick={onCancel} className="btn-ghost text-xs py-1.5 px-4">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Market Items Tab
// ---------------------------------------------------------------------------

const VENUE_LABELS: Record<MarketItem['venue'], string> = {
  general: '🏪 General Store',
  black_market: '🕵️ Black Market',
  traveling_merchant: '🐪 Traveling Merchant',
  parents_store: "🛡️ Parents' Store",
  spoils_teens: '👑 Spoils (Teens — when Parents fort falls)',
  spoils_parents: '🔓 Spoils (Parents — when Teens fort falls)',
}

function MarketTab({ initialItems }: { initialItems: MarketItem[] }) {
  const [items, setItems] = useState<MarketItem[]>(initialItems)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<MarketItem>>({})
  const [showAdd, setShowAdd] = useState(false)

  const blankItem = {
    item_key: '',
    display_name: '',
    description: '',
    venue: 'general' as MarketItem['venue'],
    price_gold: 10,
    effect: '{}',
    available_days: [] as string[],
    notifyOnPurchase: false,
  }
  const [addForm, setAddForm] = useState(blankItem)

  // Always fetch fresh data on mount via the API to bypass any server cache
  useEffect(() => {
    refreshItems()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(null), 3500)
  }

  async function refreshItems() {
    const res = await fetch('/api/admin/market-items')
    if (res.ok) {
      const data = await res.json()
      setItems(data as MarketItem[])
    }
  }

  async function createItem() {
    setLoading(true)
    let effect: Record<string, unknown>
    try {
      effect = JSON.parse(addForm.effect)
    } catch {
      flash('Effect must be valid JSON')
      setLoading(false)
      return
    }
    if (addForm.notifyOnPurchase) effect.notify = true
    else delete effect.notify
    const res = await fetch('/api/admin/market-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...addForm,
        effect,
        available_days: addForm.available_days.length > 0 ? addForm.available_days : null,
      }),
    })
    const data = await res.json()
    if (data.ok) {
      flash('Item created!')
      setAddForm(blankItem)
      setShowAdd(false)
      await refreshItems()
    } else {
      flash(`Error: ${data.error}`)
    }
    setLoading(false)
  }

  const [editEffectJson, setEditEffectJson] = useState<Record<string, string>>({})

  function startEditItem(item: MarketItem) {
    setEditingId(item.id)
    setEditForm({
      display_name: item.display_name,
      description: item.description ?? '',
      venue: item.venue,
      price_gold: item.price_gold,
      available_days: item.available_days ?? [],
    })
    setEditEffectJson((prev) => ({ ...prev, [item.id]: JSON.stringify(item.effect, null, 2) }))
  }

  async function saveItem(item: MarketItem) {
    setLoading(true)
    let effect: Record<string, unknown>
    try {
      effect = JSON.parse(editEffectJson[item.id] ?? '{}')
    } catch {
      flash('Effect must be valid JSON')
      setLoading(false)
      return
    }
    const res = await fetch('/api/admin/market-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id,
        ...editForm,
        effect,
        available_days:
          (editForm.available_days as string[] | undefined)?.length
            ? editForm.available_days
            : null,
      }),
    })
    const data = await res.json()
    if (data.ok) {
      flash('Item updated!')
      setEditingId(null)
      await refreshItems()
    } else {
      flash(`Error: ${data.error}`)
    }
    setLoading(false)
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this market item?')) return
    setLoading(true)
    const res = await fetch('/api/admin/market-items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const data = await res.json()
    if (data.ok) {
      flash('Item deleted.')
      setItems((prev) => prev.filter((i) => i.id !== id))
    } else {
      flash(`Error: ${data.error}`)
    }
    setLoading(false)
  }

  const venues: MarketItem['venue'][] = [
    'general',
    'parents_store',
    'black_market',
    'traveling_merchant',
    'spoils_teens',
    'spoils_parents',
  ]

  return (
    <div className="space-y-6">
      {msg && (
        <div className="bg-amber-900/40 border border-amber-600 rounded-lg px-4 py-3 text-amber-200 text-sm">
          {msg}
        </div>
      )}

      {/* Add Item */}
      <section className="panel space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg text-amber-200 font-bold">Market Items</h2>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="btn-primary text-xs py-1.5 px-4"
          >
            {showAdd ? 'Cancel' : '+ Add Item'}
          </button>
        </div>

        {showAdd && (
          <div className="border border-emerald-700 bg-emerald-950/20 rounded-lg p-4 space-y-3">
            <h3 className="text-sm text-emerald-300 font-bold">New Item</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Item Key (unique slug)</label>
                <input
                  value={addForm.item_key}
                  onChange={(e) => setAddForm((f) => ({ ...f, item_key: e.target.value }))}
                  className="input w-full"
                  placeholder="shield_of_valor"
                />
              </div>
              <div>
                <label className="label">Display Name</label>
                <input
                  value={addForm.display_name}
                  onChange={(e) => setAddForm((f) => ({ ...f, display_name: e.target.value }))}
                  className="input w-full"
                  placeholder="Shield of Valor"
                />
              </div>
              <div className="col-span-2">
                <label className="label">Description</label>
                <input
                  value={addForm.description}
                  onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                  className="input w-full"
                  placeholder="A mighty shield…"
                />
              </div>
              <div>
                <label className="label">Venue</label>
                <select
                  value={addForm.venue}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, venue: e.target.value as MarketItem['venue'] }))
                  }
                  className="input w-full"
                >
                  <option value="general">🏪 General Store</option>
                  <option value="parents_store">🛡️ Parents&apos; Store</option>
                  <option value="black_market">🕵️ Black Market</option>
                  <option value="traveling_merchant">🐪 Traveling Merchant</option>
                  <option value="spoils_teens">👑 Spoils — Teens (enemy Parents fort at 0 HP)</option>
                  <option value="spoils_parents">🔓 Spoils — Parents (enemy Teens fort at 0 HP)</option>
                </select>
              </div>
              <div>
                <label className="label">Price (gold)</label>
                <input
                  type="number"
                  value={addForm.price_gold}
                  min={0}
                  onChange={(e) => setAddForm((f) => ({ ...f, price_gold: Number(e.target.value) }))}
                  className="input w-full"
                />
              </div>
              <div className="col-span-2">
                <label className="label">
                  Available Days
                  <span className="text-stone-500 ml-1">(none = random daily rotation)</span>
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {DAY_NAMES.map((day) => (
                    <label key={day} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addForm.available_days.includes(day)}
                        onChange={(e) =>
                          setAddForm((f) => ({
                            ...f,
                            available_days: e.target.checked
                              ? [...f.available_days, day]
                              : f.available_days.filter((d) => d !== day),
                          }))
                        }
                        className="w-3.5 h-3.5 accent-amber-500"
                      />
                      <span className="text-xs text-stone-300 capitalize">{DAY_LABELS[day]}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={addForm.notifyOnPurchase}
                    onChange={(e) => setAddForm((f) => ({ ...f, notifyOnPurchase: e.target.checked }))}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span className="label mb-0">📢 Notify on Discord when purchased</span>
                </label>
              </div>
              <div className="col-span-2">
                <label className="label">Effect (JSON)</label>
                <textarea
                  value={addForm.effect}
                  onChange={(e) => setAddForm((f) => ({ ...f, effect: e.target.value }))}
                  className="input w-full h-16 resize-none font-mono text-xs"
                  placeholder='{}'
                />
              </div>
            </div>
            <button
              onClick={createItem}
              disabled={!addForm.item_key || !addForm.display_name || loading}
              className="btn-primary"
            >
              {loading ? 'Creating…' : 'Create Item'}
            </button>
          </div>
        )}
      </section>

      {/* Items grouped by venue */}
      {venues.map((venue) => {
        const venueItems = items.filter((i) => i.venue === venue)
        return (
          <section key={venue} className="panel space-y-2">
            <h3 className="text-sm text-amber-300 font-bold">{VENUE_LABELS[venue]}</h3>
            {venueItems.length === 0 && (
              <p className="text-stone-500 text-xs italic">No items in this venue.</p>
            )}
            {venueItems.map((item) =>
              editingId === item.id ? (
                <MarketItemEditRow
                  key={item.id}
                  item={item}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  effectJson={editEffectJson[item.id] ?? '{}'}
                  setEffectJson={(v) =>
                    setEditEffectJson((prev) => ({ ...prev, [item.id]: v }))
                  }
                  onSave={() => saveItem(item)}
                  onCancel={() => setEditingId(null)}
                  loading={loading}
                />
              ) : (
                <MarketItemRow
                  key={item.id}
                  item={item}
                  onEdit={() => startEditItem(item)}
                  onDelete={() => deleteItem(item.id)}
                />
              )
            )}
          </section>
        )
      })}
    </div>
  )
}

function MarketItemRow({
  item,
  onEdit,
  onDelete,
}: {
  item: MarketItem
  onEdit: () => void
  onDelete: () => void
}) {
  const days = item.available_days ?? []
  const notifies = (item.effect as Record<string, unknown>)?.notify === true
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-stone-600 text-sm">
      <span className="flex-1 text-stone-200 font-bold truncate">{item.display_name}</span>
      {notifies && (
        <span className="text-xs text-amber-400 shrink-0" title="Notifies Discord on purchase">📢</span>
      )}
      {/* Availability badge */}
      {days.length > 0 ? (
        <span className="text-xs text-sky-400 border border-sky-800 px-1.5 py-0.5 rounded shrink-0 capitalize">
          {days.map((d) => DAY_LABELS[d as keyof typeof DAY_LABELS] ?? d).join(', ')}
        </span>
      ) : (
        <span className="text-xs text-stone-600 shrink-0">🔀 random</span>
      )}
      <span className="text-amber-400 text-xs shrink-0">{item.price_gold}g</span>
      <button onClick={onEdit} className="text-xs text-sky-400 hover:text-sky-300 touch-manipulation shrink-0">
        Edit
      </button>
      <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-400 touch-manipulation shrink-0">
        Delete
      </button>
    </div>
  )
}

function MarketItemEditRow({
  item,
  editForm,
  setEditForm,
  effectJson,
  setEffectJson,
  onSave,
  onCancel,
  loading,
}: {
  item: MarketItem
  editForm: Partial<MarketItem>
  setEditForm: React.Dispatch<React.SetStateAction<Partial<MarketItem>>>
  effectJson: string
  setEffectJson: (v: string) => void
  onSave: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="rounded-lg border border-sky-700 bg-sky-950/20 p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Display Name</label>
          <input
            value={editForm.display_name ?? item.display_name}
            onChange={(e) => setEditForm((f) => ({ ...f, display_name: e.target.value }))}
            className="input w-full"
          />
        </div>
        <div>
          <label className="label">Price (gold)</label>
          <input
            type="number"
            value={editForm.price_gold ?? item.price_gold}
            min={0}
            onChange={(e) => setEditForm((f) => ({ ...f, price_gold: Number(e.target.value) }))}
            className="input w-full"
          />
        </div>
        <div className="col-span-2">
          <label className="label">Description</label>
          <input
            value={editForm.description ?? item.description ?? ''}
            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
            className="input w-full"
          />
        </div>
        <div>
          <label className="label">Venue</label>
          <select
            value={editForm.venue ?? item.venue}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, venue: e.target.value as MarketItem['venue'] }))
            }
            className="input w-full"
          >
            <option value="general">🏪 General Store</option>
            <option value="parents_store">🛡️ Parents&apos; Store</option>
            <option value="black_market">🕵️ Black Market</option>
            <option value="traveling_merchant">🐪 Traveling Merchant</option>
            <option value="spoils_teens">👑 Spoils — Teens (enemy Parents fort at 0 HP)</option>
            <option value="spoils_parents">🔓 Spoils — Parents (enemy Teens fort at 0 HP)</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">
            Available Days
            <span className="text-stone-500 ml-1">(none = random daily rotation)</span>
          </label>
          <div className="flex flex-wrap gap-2 mt-1">
            {DAY_NAMES.map((day) => {
              const current = (editForm.available_days as string[] | undefined) ?? item.available_days ?? []
              return (
                <label key={day} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={current.includes(day)}
                    onChange={(e) => {
                      const prev = (editForm.available_days as string[] | undefined) ?? item.available_days ?? []
                      setEditForm((f) => ({
                        ...f,
                        available_days: e.target.checked
                          ? [...prev, day]
                          : prev.filter((d) => d !== day),
                      }))
                    }}
                    className="w-3.5 h-3.5 accent-amber-500"
                  />
                  <span className="text-xs text-stone-300 capitalize">{DAY_LABELS[day]}</span>
                </label>
              )
            })}
          </div>
        </div>
        <div className="col-span-2">
          {(() => {
            let parsed: Record<string, unknown> = {}
            try { parsed = JSON.parse(effectJson) } catch {}
            const notifyOn = parsed.notify === true
            return (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notifyOn}
                  onChange={(e) => {
                    try {
                      const obj = JSON.parse(effectJson) as Record<string, unknown>
                      if (e.target.checked) obj.notify = true
                      else delete obj.notify
                      setEffectJson(JSON.stringify(obj, null, 2))
                    } catch {}
                  }}
                  className="w-4 h-4 accent-amber-500"
                />
                <span className="label mb-0">📢 Notify on Discord when purchased</span>
              </label>
            )
          })()}
        </div>
        <div className="col-span-2">
          <label className="label">Effect (JSON)</label>
          <textarea
            value={effectJson}
            onChange={(e) => setEffectJson(e.target.value)}
            className="input w-full h-16 resize-none font-mono text-xs"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} disabled={loading} className="btn-primary text-xs py-1.5 px-4">
          Save
        </button>
        <button onClick={onCancel} className="btn-ghost text-xs py-1.5 px-4">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Battle Chronicles Tab
// ---------------------------------------------------------------------------

function ChroniclesTab({
  initialLog,
  factions,
}: {
  initialLog: CombatLogEntry[]
  factions: Faction[]
}) {
  const [log, setLog] = useState<CombatLogEntry[]>(initialLog)
  const [msg, setMsg] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  function factionName(id: string | null) {
    return factions.find((f) => f.id === id)?.display_name ?? '?'
  }

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(null), 4000)
  }

  async function revokeEntry(entry: CombatLogEntry) {
    const confirmed = confirm(
      `Revoke this entry?\n\n"${entry.family_member_name ?? 'Unknown'}" — ${entry.bounty_title ?? 'Unknown chore'}\n\nThis will un-complete the chore, subtract gold/XP, and revert faction HP.`
    )
    if (!confirmed) return

    setRevoking(entry.id)
    const res = await fetch('/api/admin/revoke-combat-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logId: entry.id }),
    })
    const data = await res.json()
    if (data.ok) {
      flash('Entry revoked and chore restored.')
      setLog((prev) => prev.filter((e) => e.id !== entry.id))
    } else {
      flash(`Error: ${data.error}`)
    }
    setRevoking(null)
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className="bg-amber-900/40 border border-amber-600 rounded-lg px-4 py-3 text-amber-200 text-sm">
          {msg}
        </div>
      )}

      <section className="panel space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg text-amber-200 font-bold">Battle Chronicles</h2>
          <span className="text-xs text-stone-500">Last 50 entries</span>
        </div>

        <p className="text-xs text-stone-400">
          Use <strong className="text-amber-300">Revoke</strong> to undo a falsely claimed chore — it restores the chore, subtracts the gold & XP, and reverts the faction HP change.
        </p>

        <div className="space-y-2">
          {log.length === 0 && (
            <p className="text-stone-500 text-sm italic text-center py-8">No battle records.</p>
          )}
          {log.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-lg px-3 py-2.5 border text-sm flex items-start gap-3
                ${entry.action === 'attack'
                  ? 'border-red-800/50 bg-red-950/20'
                  : 'border-emerald-800/50 bg-emerald-950/20'}`}
            >
              <span className="text-lg shrink-0 mt-0.5">
                {entry.action === 'attack' ? '⚔️' : '🛡️'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-amber-300 font-bold">
                    {entry.family_member_name ?? factionName(entry.actor_faction_id)}
                  </span>
                  <span className="text-stone-400 text-xs">
                    {entry.action === 'attack' ? 'attacked' : 'healed'}
                  </span>
                  {entry.action === 'attack' && (
                    <span className="text-stone-300 text-xs">
                      → {factionName(entry.target_faction_id)}
                    </span>
                  )}
                  <span
                    className={`font-bold text-xs ml-auto ${
                      entry.action === 'attack' ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {entry.action === 'attack' ? '−' : '+'}
                    {entry.final_value}
                    {entry.is_crit && <span className="text-yellow-400 ml-1">CRIT</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-500">
                  {entry.bounty_title && (
                    <span className="italic truncate">{entry.bounty_title}</span>
                  )}
                  <span className="ml-auto shrink-0">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <button
                onClick={() => revokeEntry(entry)}
                disabled={revoking === entry.id}
                className="shrink-0 text-xs font-bold px-2.5 py-1 rounded border border-red-700 text-red-400 hover:bg-red-900/40 touch-manipulation transition-colors disabled:opacity-40"
              >
                {revoking === entry.id ? '…' : 'Revoke'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// War Controls Tab
// ---------------------------------------------------------------------------

function WarTab({ factions, initialTimezone }: { factions: Faction[]; initialTimezone: string }) {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [timezone, setTimezone] = useState(initialTimezone)

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(null), 5000)
  }

  async function saveTimezone(tz: string) {
    setTimezone(tz)
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ war_timezone: tz }),
    })
    const data = await res.json()
    flash(data.ok ? `Timezone saved: ${tz}` : `Error: ${data.error}`)
  }

  async function scheduleMarket(venue: 'black_market' | 'traveling_merchant') {
    setLoading(true)
    const res = await fetch('/api/market/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venue }),
    })
    const data = await res.json()
    flash(
      data.ok
        ? `Opened! Closes at: ${new Date(data.closesAt).toLocaleString()}`
        : data.error
    )
    setLoading(false)
  }

  async function resetWar() {
    if (!confirm('Reset the war? This records this week and resets HP to 100.')) return
    setLoading(true)
    const res = await fetch('/api/reset-war', { method: 'POST' })
    const data = await res.json()
    flash(data.ok ? 'War reset! Forts restored.' : data.error)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className="bg-amber-900/40 border border-amber-600 rounded-lg px-4 py-3 text-amber-200 text-sm">
          {msg}
        </div>
      )}

      <section className="panel space-y-4">
        <h2 className="text-lg text-amber-200 font-bold">Faction HP</h2>
        <div className="grid grid-cols-2 gap-4">
          {factions.map((f) => {
            const pct = Math.round((f.current_hp / f.max_hp) * 100)
            return (
              <div key={f.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-300">{f.display_name}</span>
                  <span className="text-amber-300 font-bold">
                    {f.current_hp} / {f.max_hp}
                  </span>
                </div>
                <div className="h-3 bg-stone-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-700 to-amber-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <button
          onClick={resetWar}
          disabled={loading}
          className="px-4 py-2 bg-red-900 hover:bg-red-800 border border-red-700 rounded-lg text-sm font-bold touch-manipulation transition-colors disabled:opacity-40"
        >
          🔄 Reset War Week
        </button>
      </section>

      <section className="panel space-y-3">
        <h2 className="text-lg text-amber-200 font-bold">⏰ Timezone</h2>
        <p className="text-xs text-stone-400">
          Controls when daily bounties and market stock refresh (midnight in this zone).
        </p>
        <select
          value={timezone}
          onChange={(e) => saveTimezone(e.target.value)}
          className="input w-full max-w-xs"
        >
          {US_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </section>

      <section className="panel space-y-3">
        <h2 className="text-lg text-amber-200 font-bold">Market Windows</h2>
        <p className="text-xs text-stone-400">Manually open a timed market window.</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => scheduleMarket('black_market')}
            disabled={loading}
            className="px-4 py-2 bg-purple-900 hover:bg-purple-800 border border-purple-600 rounded-lg text-sm font-bold touch-manipulation"
          >
            🕵️ Open Black Market (10 hr)
          </button>
          <button
            onClick={() => scheduleMarket('traveling_merchant')}
            disabled={loading}
            className="px-4 py-2 bg-cyan-900 hover:bg-cyan-800 border border-cyan-600 rounded-lg text-sm font-bold touch-manipulation"
          >
            🐪 Open Traveling Merchant (2 hr)
          </button>
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root AdminPanel
// ---------------------------------------------------------------------------

const TAB_META: { id: Tab; label: string; icon: string }[] = [
  { id: 'chores', label: 'Chores', icon: '📜' },
  { id: 'market', label: 'Market', icon: '🏪' },
  { id: 'chronicles', label: 'Chronicles', icon: '🗡' },
  { id: 'war', label: 'War', icon: '⚔️' },
]

export function AdminPanel({ bounties, factions, marketItems, combatLog, timezone }: Props) {
  const [tab, setTab] = useState<Tab>('chores')

  return (
    <div className="fixed inset-0 bg-dark-stone text-stone-300 font-medieval flex flex-col">
      {/* Header */}
      <div className="shrink-0 bg-stone-950/95 border-b border-stone-700">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <a href="/" className="text-stone-500 hover:text-amber-400 text-sm shrink-0">
            ← Dashboard
          </a>
          <h1 className="text-xl text-amber-300 font-bold">⚙ Admin Panel</h1>
        </div>
        {/* Tab bar */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          {TAB_META.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors touch-manipulation
                ${tab === t.id
                  ? 'border-amber-500 text-amber-300'
                  : 'border-transparent text-stone-500 hover:text-stone-300'}`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content — scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {tab === 'chores' && <ChoresTab initialBounties={bounties} />}
          {tab === 'market' && <MarketTab initialItems={marketItems} />}
          {tab === 'chronicles' && <ChroniclesTab initialLog={combatLog} factions={factions} />}
          {tab === 'war' && <WarTab factions={factions} initialTimezone={timezone} />}
        </div>
      </div>
    </div>
  )
}
