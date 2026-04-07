# Streamlined Photo Capture Flow

## Context

During asset intake, users capture 7-10 suggested photos by repeatedly: tapping "Capture" on checklist → taking photo → confirming → returning to checklist → finding next item. For field workers walking around heavy equipment, this round-trip per photo creates unnecessary friction. This design introduces an auto-advance capture flow that keeps users in a continuous capture loop.

## Design

### New Component: `CaptureFlowScreen`

A full-screen orchestrator rendered inside `GuidedPhotosScreen` (same pattern as `CameraViewfinder` replacing the screen when `cameraOpen` is true). Three internal states:

1. **`camera`** — renders `CameraViewfinder` with current item's label + a progress strip overlay
2. **`interstitial`** — shows confirmation of saved photo + next item prompt with Skip/Ready buttons
3. **`complete`** — triggers return to checklist summary

**Props:**
```ts
interface CaptureFlowScreenProps {
  checklist: string[]
  photos: AssetPhoto[]
  startFrom: string | null  // null = first uncaptured
  onPhotoCapture: (photo: AssetPhoto) => void
  onSkip: (label: string) => void
  onComplete: () => void
  onExit: () => void  // user taps list button mid-flow
}
```

**Queue logic:**
- Builds ordered queue of uncaptured items starting from `startFrom`
- After each capture or skip, advances to next in queue
- When queue empty → calls `onComplete()`

### Camera Screen — Progress Strip Overlay

Rendered by `CaptureFlowScreen` on top of `CameraViewfinder` (not inside it — camera component stays unchanged):

```
┌─────────────────────────────┐
│         3/8          [list] │  ← semi-transparent progress strip
│                             │
│      (live camera view)     │
│   ┌───────────────────┐    │
│   │    Left Side       │    │  ← CameraViewfinder's existing label bar
│   └───────────────────┘    │
│         ( shutter )         │
└─────────────────────────────┘
```

- Position counter + list icon button (label already shown by `CameraViewfinder`'s label bar)
- List button calls `onExit()` → returns to checklist summary

### Interstitial Screen

Shown between captures. User-controlled pacing (no auto-timer) because physical repositioning time around equipment varies.

```
┌─────────────────────────────┐
│       ✓ Front — saved       │
│                             │
│     Next: Left Side         │
│         3 of 8              │
│                             │
│   [ Skip ]      [ Ready ]  │
└─────────────────────────────┘
```

- **Skip** (secondary/gray): marks item as skipped, advances to next
- **Ready** (primary/orange): opens camera for next item
- Uses existing theme tokens

### Checklist Summary Updates (`GuidedPhotosScreen`)

1. **"Start Capturing" button** — prominent, launches `CaptureFlowScreen` from first uncaptured item
2. **Individual "Capture" buttons** — enter auto-advance flow starting from that item, continuing through remaining uncaptured
3. **Skipped items** — "Skipped" badge + "Capture" button
4. **Retake** — opens camera for that single photo only (no auto-advance), same as today
5. **Delete** — same as today

### Skip State Tracking

New state in `GuidedPhotosScreen`:
```ts
const [skippedLabels, setSkippedLabels] = useState<string[]>([])
```

Persisted to wizard draft via `WizardStateManager.saveStep()` alongside photos. This distinguishes "skipped" from "not yet attempted" in the checklist UI.

### Navigation

No changes to the custom router in `App.tsx`. `CaptureFlowScreen` renders inside `GuidedPhotosScreen` as a conditional mode:

```ts
// GuidedPhotosScreen
const [captureFlowActive, setCaptureFlowActive] = useState(false)
const [captureFlowStartLabel, setCaptureFlowStartLabel] = useState<string | null>(null)

if (captureFlowActive) {
  return <CaptureFlowScreen ... />
}
// else render checklist
```

### Entry Points

| Action | Behavior |
|--------|----------|
| "Start Capturing" button | Flow from first uncaptured item through all remaining |
| Tap "Capture" on specific item | Flow from that item through all remaining uncaptured |
| Tap "Retake" on captured item | Single photo capture, return to checklist |
| List button during flow | Exit flow, return to checklist |

## Files to Modify

| File | Change |
|------|--------|
| `mobile/src/screens/CaptureFlowScreen.tsx` | **New** — flow orchestrator component |
| `mobile/src/screens/GuidedPhotosScreen.tsx` | Add capture flow mode, "Start Capturing" button, skipped state, skip badges |
| `mobile/src/state/WizardStateManager.ts` | Add `skippedLabels: string[]` to `IntakeDraft` |
| `mobile/src/App.tsx` | Pass `skippedLabels` through to `GuidedPhotosScreen`, persist in draft |

`CameraViewfinder` is **not modified**.

## Verification

1. Launch app, start new intake, reach guided photos screen
2. Tap "Start Capturing" — camera should open with first checklist item label + progress strip
3. Take photo → confirm → interstitial should show with confirmation + next item
4. Tap "Skip" → should advance to next item
5. Tap list icon → should return to checklist showing captured + skipped statuses
6. Tap "Capture" on a specific uncaptured item → should enter flow from that point
7. Complete all items → should return to checklist summary
8. Tap "Retake" on captured item → should open single capture, return to list
9. Kill and reopen app → draft should restore skipped labels
10. Run existing tests to ensure no regressions
