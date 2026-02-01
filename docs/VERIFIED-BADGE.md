# Verified Badge Implementation

## Purpose
Add credibility to leaderboards by showing which users have verified their financial data through Plaid bank connections.

## Why It Matters
- **Prevents score gaming:** Users can't fake high scores with manual entry
- **Encourages Plaid adoption:** Verified badge = social proof
- **Builds trust:** Top performers are using real data
- **Differentiates tiers:** Pro users (with Plaid) get verified status

---

## Database Changes

### profiles table
Add column:
```sql
ALTER TABLE profiles
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
```

Update when Plaid connects:
```sql
UPDATE profiles
SET is_verified = TRUE
WHERE id = <user_id> AND plaid_access_token IS NOT NULL;
```

---

## UI Changes

### Leaderboard Display
**Before:**
```
1. John D.          850 pts
2. Sarah M.         823 pts
3. Mike R.          801 pts
```

**After:**
```
1. John D. ✓        850 pts    (verified)
2. Sarah M.         823 pts
3. Mike R. ✓        801 pts    (verified)
```

### Badge Styles
- **Icon:** ✓ (checkmark in circle)
- **Color:** Blue (#3b82f6) for verified, gray for unverified
- **Tooltip:** "Verified with bank connection" on hover
- **Size:** Small (14-16px) next to username

### Where to Show Badge
1. **Leaderboard rows** (main focus)
2. **User profile page** (next to name/avatar)
3. **Score page** (if showing public scores)
4. **Challenge participants** (if visible)

---

## Implementation Steps

### 1. Database Migration (5 min)
```sql
-- Add is_verified column
ALTER TABLE profiles
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;

-- Set verified for existing Plaid users
UPDATE profiles
SET is_verified = TRUE
WHERE plaid_access_token IS NOT NULL;
```

### 2. Backend API Update (10 min)
Update leaderboard API to include `is_verified`:
```typescript
// src/app/api/leaderboards/route.ts
const { data } = await supabase
  .from('profiles')
  .select('id, display_name, score, is_verified')
  .order('score', { ascending: false })
  .limit(100);
```

### 3. UI Component (30 min)
Create `VerifiedBadge` component:
```tsx
// src/components/ui/verified-badge.tsx
export function VerifiedBadge({ isVerified }: { isVerified: boolean }) {
  if (!isVerified) return null;
  
  return (
    <Tooltip>
      <TooltipTrigger>
        <CheckCircle2 className="w-4 h-4 text-blue-400" />
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Verified with bank connection</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

### 4. Integrate into Leaderboard (15 min)
```tsx
// In leaderboard row
<div className="flex items-center gap-2">
  <span className="font-medium">{user.display_name}</span>
  <VerifiedBadge isVerified={user.is_verified} />
</div>
```

### 5. Update Plaid Connection Handler (10 min)
When Plaid link succeeds, set `is_verified = true`:
```typescript
// After Plaid token exchange
await supabase
  .from('profiles')
  .update({ is_verified: true })
  .eq('id', user.id);
```

---

## Edge Cases

### What if user disconnects Plaid?
- Set `is_verified = false` when they remove bank connection
- Keep historical scores (don't delete)
- Show "Previously verified" badge (grayed out)?

### What about manual CSV import users?
- They stay unverified
- Can still use the app fully
- Just won't have verified badge on leaderboards

### What if someone games the system by connecting then disconnecting?
- Once verified, they stay verified for that billing cycle
- Reset verification monthly if Plaid is disconnected
- Add "Last verified: X days ago" tooltip

---

## Future Enhancements

1. **Verification levels:**
   - ✓ Basic: Plaid connected
   - ✓✓ Advanced: 3+ months of transaction history
   - ✓✓✓ Elite: 12+ months + investment accounts connected

2. **Verification incentives:**
   - Verified users get exclusive challenges
   - Higher reward multipliers on leaderboard points
   - Access to "Verified Players Only" leaderboard

3. **Verification reminders:**
   - "Connect your bank to get verified!" banner
   - Monthly re-verification check

---

## Time Estimate
**Total: 1-2 hours**
- Database: 5 min
- API: 10 min
- UI Component: 30 min
- Integration: 15 min
- Testing: 30 min
- Documentation: 10 min

---

## Priority
**Medium-High** — Not critical for MVP, but adds credibility to leaderboards and encourages Pro tier upgrades.

**Build when:** After leaderboards are implemented, before public launch.
