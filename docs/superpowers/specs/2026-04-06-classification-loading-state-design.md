# AI Classification Loading State

## Context

When the user navigates to the "Validate Classification" screen (step 3), the Photo Checklist shows 7 default generic items (`DEFAULT_CHECKLIST`) then jumps to the AI-generated asset-specific checklist when the API resolves. Both the count and labels change, causing a jarring visual swap. On GuidedPhotosScreen (step 4) the same issue can occur if `confirmedChecklist` hasn't propagated. Locally the API resolves in <3s, but production latency will be higher and unpredictable.

**Goal:** Replace the default-then-swap pattern with an honest loading state (skeleton + indicator) followed by a smooth staggered reveal.

## Design

### 1. TaxonomyValidationScreen loading state

**Current behavior (line 60):** `isLoading = classificationLoading && !classificationResult` shows a skeleton for the taxonomy card only. The checklist preview card (line 136-149) always renders `DEFAULT_CHECKLIST` as fallback, even during loading.

**New behavior when `isLoading` is true:**

- **Taxonomy card:** Keep existing skeleton (3 shimmer bars)
- **AI banner (new):** Between the two cards, render an `AiAnalysisBanner` with `ActivityIndicator` + "Analyzing your equipment..." text with pulsing opacity (0.6-1.0, 900ms loop). Extract from `ReviewEditScreen.AiAnalysisBanner` (lines 149-178) into shared component.
- **Checklist card (new):** Render a `ChecklistSkeleton` with 5 shimmer rows matching the checklist item layout (circle + text bar + button placeholder). Extract from `GuidedPhotosScreen.SkeletonRow` (lines 75-97) into shared component.
- **Buttons:** Both "Looks Good" and "Change Classification" disabled during loading

**Key change:** The checklist preview card should ONLY render when we have actual data (AI result or user override). When `isLoading` is true, show skeleton instead of falling through to `DEFAULT_CHECKLIST`. The `DEFAULT_CHECKLIST` constant remains — it's still the fallback for manual override categories not in `CATEGORY_CHECKLISTS`.

### 2. Staggered checklist reveal

When `classificationResult` transitions from null to populated:

- Taxonomy card renders immediately
- Checklist items reveal sequentially via a `revealedCount` state:
  - Starts at 0, increments every 60ms via `setInterval`
  - Each item fades in with opacity 0 -> 1 over 150ms (`Animated.timing`)
  - Items beyond `revealedCount` are hidden
- "Looks Good" enables once `revealedCount === checklist.length`
- Total reveal time for 10 items: ~600ms (feels dynamic but doesn't block the user long)

Implementation: `useEffect` watches `classificationResult` — when it goes from null to non-null, start the interval. Clean up on unmount.

### 3. GuidedPhotosScreen — no changes needed

The user must tap "Looks Good" on TaxonomyValidation before reaching this screen, which calls `onConfirm(taxonomy, checklist)` setting `confirmedChecklist` in App.tsx (line 331). The GuidedPhotosScreen receives this confirmed list directly (App.tsx line 346). The `isChecklistLoading` prop (line 350) would be false since `classificationResult` is set.

The existing `SkeletonRow` and `isChecklistLoading` handling remain as a safety net for draft resume edge cases. No stagger needed here — user already saw the checklist.

### 4. Shared components to extract

#### `mobile/src/components/AiAnalysisBanner.tsx`
- Extract from `ReviewEditScreen` (lines 149-178)
- Props: `message?: string` (default "AI is analyzing your photos...")
- Pulsing `Animated.View` (opacity 0.6-1.0, 900ms loop) with `ActivityIndicator` + message text
- Styled with `surfaceAlt` background, `primary` left border accent
- Update `ReviewEditScreen` to import from shared component

#### `mobile/src/components/ChecklistSkeleton.tsx`
- Extract from `GuidedPhotosScreen.SkeletonRow` (lines 75-97)
- Props: `rows?: number` (default 5)
- Each row: circle (24px) + text bar (flex) + button placeholder (76x34)
- Shimmer: `Animated.timing` opacity 0.4-1.0, 600ms loop
- Update `GuidedPhotosScreen` to import from shared component

## Files to modify

| File | Change |
|------|--------|
| `mobile/src/components/AiAnalysisBanner.tsx` | **New** — extract from ReviewEditScreen |
| `mobile/src/components/ChecklistSkeleton.tsx` | **New** — extract from GuidedPhotosScreen |
| `mobile/src/screens/TaxonomyValidationScreen.tsx` | Add full loading state (banner + checklist skeleton), add staggered reveal logic, remove DEFAULT_CHECKLIST fallback during loading |
| `mobile/src/screens/ReviewEditScreen.tsx` | Import shared `AiAnalysisBanner`, delete inline version |
| `mobile/src/screens/GuidedPhotosScreen.tsx` | Import shared `ChecklistSkeleton`, delete inline `SkeletonRow` |

## Verification

1. **Local testing:** Run `npx expo start`, navigate through the wizard. On TaxonomyValidation, verify skeleton + banner appear while AI is loading, then checklist items reveal with stagger
2. **Simulate slow network:** Add a `setTimeout` delay (5-10s) around the `classifyEquipment` call in App.tsx to test sustained loading state
3. **Regression:** Verify ReviewEditScreen still shows shimmer during AI analysis (shared component works)
4. **Regression:** Verify GuidedPhotosScreen skeleton still works for draft resume edge case
5. **Run tests:** `npx jest` — update TaxonomyValidationScreen tests to expect new skeleton structure and banner
