# Streamlined Photo Capture Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-photo round-trip to the checklist with an auto-advance capture flow that keeps field workers in a continuous capture loop.

**Architecture:** A new `CaptureFlowScreen` component renders inside `GuidedPhotosScreen` (same pattern as `CameraViewfinder` already replaces the screen today). `GuidedPhotosScreen` gains `skippedLabels`/`onSkippedLabelsChange` props and a "Start Capturing" entry point. `CaptureFlowScreen` is a pure orchestrator — `CameraViewfinder` is not modified.

**Tech Stack:** React Native (Expo), TypeScript, `@testing-library/react-native`, `useSafeAreaInsets`, existing theme tokens.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `mobile/src/state/WizardStateManager.ts` | Modify | Add `skippedLabels?: string[]` to `IntakeDraft` |
| `mobile/src/screens/CaptureFlowScreen.tsx` | Create | Auto-advance camera flow orchestrator |
| `mobile/src/screens/GuidedPhotosScreen.tsx` | Modify | Entry points, skipped state, flow rendering |
| `mobile/src/App.tsx` | Modify | Wire `skippedLabels` state + draft persistence |
| `mobile/src/__tests__/WizardStateManager.test.ts` | Modify | Add test for skippedLabels persistence |
| `mobile/src/__tests__/CaptureFlowScreen.test.tsx` | Create | Full behavior coverage |
| `mobile/src/__tests__/GuidedPhotosScreen.test.tsx` | Modify | Update defaults + new feature tests |

---

## Task 1: Add `skippedLabels` to `IntakeDraft`

**Files:**
- Modify: `mobile/src/state/WizardStateManager.ts`
- Modify: `mobile/src/__tests__/WizardStateManager.test.ts`

- [ ] **Step 1: Write failing test**

Add to `mobile/src/__tests__/WizardStateManager.test.ts` after the existing tests:

```ts
it('saves skippedLabels to draft', async () => {
  ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
  ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)

  await manager.saveStep('guided-photos', { skippedLabels: ['Serial Plate', 'Engine'] })

  const [, saved] = (AsyncStorage.setItem as jest.Mock).mock.calls[0]
  const parsed = JSON.parse(saved)
  expect(parsed.skippedLabels).toEqual(['Serial Plate', 'Engine'])
})

it('merges skippedLabels with existing draft', async () => {
  const existing: Partial<IntakeDraft> = {
    step: 'guided-photos',
    skippedLabels: ['Front'],
  }
  ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing))
  ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)

  await manager.saveStep('guided-photos', { skippedLabels: ['Front', 'Rear'] })

  const [, saved] = (AsyncStorage.setItem as jest.Mock).mock.calls[0]
  const parsed = JSON.parse(saved)
  expect(parsed.skippedLabels).toEqual(['Front', 'Rear'])
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/zanthrash/work/mater/mobile && npx jest --testPathPattern="WizardStateManager" --no-coverage
```

Expected: TypeScript error or test failure — `skippedLabels` does not exist on `IntakeDraft`

- [ ] **Step 3: Add `skippedLabels` to `IntakeDraft`**

In `mobile/src/state/WizardStateManager.ts`, add `skippedLabels` to the `IntakeDraft` interface after `photos`:

```ts
export interface IntakeDraft {
  step: IntakeStep
  overviewUri?: string
  overviewBase64?: string
  vin?: string
  vinResult?: {
    make: string | null
    model: string | null
    year: number | null
    engineType: string | null
    transmission: string | null
    gvwLbs: number | null
    source: 'nhtsa' | 'claude'
  } | null
  classificationResult?: {
    taxonomy: { category: string; type: string; subtype: string | null; confidence: number }
    photoChecklist: string[]
  } | null
  photos?: AssetPhoto[]
  skippedLabels?: string[]
  aiSpecResult?: {
    coreSpecs: {
      make: string | null
      model: string | null
      year: number | null
      engineType: string | null
      transmission: string | null
      gvwLbs: number | null
      hoursOnMeter: number | null
    }
    typeSpecificSpecs: Record<string, string | number | null>
    confidenceScore: number
  } | null
  yardMetadata?: {
    lotNumber?: string
    yardLocation?: string
    consignor?: string
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/zanthrash/work/mater/mobile && npx jest --testPathPattern="WizardStateManager" --no-coverage
```

Expected: all 12 tests pass

- [ ] **Step 5: Commit**

```bash
cd /Users/zanthrash/work/mater/mobile && git add src/state/WizardStateManager.ts src/__tests__/WizardStateManager.test.ts && git commit -m "feat: add skippedLabels to IntakeDraft"
```

---

## Task 2: Create `CaptureFlowScreen`

**Files:**
- Create: `mobile/src/screens/CaptureFlowScreen.tsx`
- Create: `mobile/src/__tests__/CaptureFlowScreen.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `mobile/src/__tests__/CaptureFlowScreen.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { CaptureFlowScreen } from '../screens/CaptureFlowScreen'
import type { AssetPhoto } from '../state/WizardStateManager'

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn().mockReturnValue('light'),
}))

jest.mock('../components/CameraViewfinder', () => ({
  CameraViewfinder: ({
    onCapture,
    onCancel,
    label,
  }: {
    onCapture: (b64: string) => void
    onCancel: () => void
    label?: string
  }) => {
    const { TouchableOpacity, Text, View } = require('react-native')
    return (
      <View testID="camera-viewfinder">
        <Text testID="camera-label">{label ?? ''}</Text>
        <TouchableOpacity testID="mock-capture" onPress={() => onCapture('mockbase64')}>
          <Text>Capture</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="mock-cancel" onPress={onCancel}>
          <Text>Cancel</Text>
        </TouchableOpacity>
      </View>
    )
  },
}))

const wrap = (node: React.ReactElement) => <SafeAreaProvider>{node}</SafeAreaProvider>

const defaultProps = {
  checklist: ['Front', 'Rear', 'Left Side'],
  photos: [] as AssetPhoto[],
  skippedLabels: [] as string[],
  startFrom: null,
  onPhotoCapture: jest.fn(),
  onSkip: jest.fn(),
  onComplete: jest.fn(),
  onExit: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

it('calls onComplete immediately when queue is empty (all captured)', () => {
  const photos: AssetPhoto[] = [
    { uri: 'data:image/jpeg;base64,a', base64: 'a', label: 'Front', type: 'guided' },
    { uri: 'data:image/jpeg;base64,b', base64: 'b', label: 'Rear', type: 'guided' },
    { uri: 'data:image/jpeg;base64,c', base64: 'c', label: 'Left Side', type: 'guided' },
  ]
  const onComplete = jest.fn()
  render(wrap(<CaptureFlowScreen {...defaultProps} photos={photos} onComplete={onComplete} />))
  expect(onComplete).toHaveBeenCalledTimes(1)
})

it('starts camera with first uncaptured item label', () => {
  const { getByTestId } = render(wrap(<CaptureFlowScreen {...defaultProps} />))
  expect(getByTestId('camera-viewfinder')).toBeTruthy()
  expect(getByTestId('camera-label').props.children).toBe('Front')
})

it('starts from specified item when startFrom is provided', () => {
  const { getByTestId } = render(
    wrap(<CaptureFlowScreen {...defaultProps} startFrom="Rear" />)
  )
  expect(getByTestId('camera-label').props.children).toBe('Rear')
})

it('shows progress strip with correct position and list/skip buttons', () => {
  const { getByTestId } = render(wrap(<CaptureFlowScreen {...defaultProps} />))
  expect(getByTestId('flow-skip-button')).toBeTruthy()
  expect(getByTestId('flow-list-button')).toBeTruthy()
})

it('taking a photo calls onPhotoCapture and advances to interstitial', () => {
  const onPhotoCapture = jest.fn()
  const { getByTestId } = render(
    wrap(<CaptureFlowScreen {...defaultProps} onPhotoCapture={onPhotoCapture} />)
  )
  fireEvent.press(getByTestId('mock-capture'))
  expect(onPhotoCapture).toHaveBeenCalledWith(
    expect.objectContaining({ label: 'Front', type: 'guided', base64: 'mockbase64' })
  )
  expect(getByTestId('capture-flow-interstitial')).toBeTruthy()
})

it('interstitial shows confirmed label and next label', () => {
  const { getByTestId, getByText } = render(wrap(<CaptureFlowScreen {...defaultProps} />))
  fireEvent.press(getByTestId('mock-capture'))
  expect(getByText('Front — saved')).toBeTruthy()
  expect(getByText('Rear')).toBeTruthy()
})

it('Ready button on interstitial returns to camera for next item', () => {
  const { getByTestId } = render(wrap(<CaptureFlowScreen {...defaultProps} />))
  fireEvent.press(getByTestId('mock-capture'))
  fireEvent.press(getByTestId('interstitial-ready-button'))
  expect(getByTestId('camera-viewfinder')).toBeTruthy()
  expect(getByTestId('camera-label').props.children).toBe('Rear')
})

it('Skip on camera calls onSkip and advances to next item', () => {
  const onSkip = jest.fn()
  const { getByTestId } = render(
    wrap(<CaptureFlowScreen {...defaultProps} onSkip={onSkip} />)
  )
  fireEvent.press(getByTestId('flow-skip-button'))
  expect(onSkip).toHaveBeenCalledWith('Front')
  expect(getByTestId('camera-label').props.children).toBe('Rear')
})

it('Skip on interstitial skips next item and goes to camera for item after', () => {
  const onSkip = jest.fn()
  const { getByTestId } = render(
    wrap(<CaptureFlowScreen {...defaultProps} onSkip={onSkip} />)
  )
  fireEvent.press(getByTestId('mock-capture'))  // capture Front → interstitial for Rear
  fireEvent.press(getByTestId('interstitial-skip-button'))  // skip Rear
  expect(onSkip).toHaveBeenCalledWith('Rear')
  expect(getByTestId('camera-label').props.children).toBe('Left Side')
})

it('capturing last item calls onComplete', () => {
  const onComplete = jest.fn()
  const checklist = ['Front']
  const { getByTestId } = render(
    wrap(<CaptureFlowScreen {...defaultProps} checklist={checklist} onComplete={onComplete} />)
  )
  fireEvent.press(getByTestId('mock-capture'))
  expect(onComplete).toHaveBeenCalledTimes(1)
})

it('list button calls onExit', () => {
  const onExit = jest.fn()
  const { getByTestId } = render(
    wrap(<CaptureFlowScreen {...defaultProps} onExit={onExit} />)
  )
  fireEvent.press(getByTestId('flow-list-button'))
  expect(onExit).toHaveBeenCalledTimes(1)
})

it('cancel on CameraViewfinder calls onExit', () => {
  const onExit = jest.fn()
  const { getByTestId } = render(
    wrap(<CaptureFlowScreen {...defaultProps} onExit={onExit} />)
  )
  fireEvent.press(getByTestId('mock-cancel'))
  expect(onExit).toHaveBeenCalledTimes(1)
})

it('excludes already-captured items from queue', () => {
  const photos: AssetPhoto[] = [
    { uri: 'data:image/jpeg;base64,a', base64: 'a', label: 'Front', type: 'guided' },
  ]
  const { getByTestId } = render(
    wrap(<CaptureFlowScreen {...defaultProps} photos={photos} />)
  )
  // Queue should start at Rear (Front is already captured)
  expect(getByTestId('camera-label').props.children).toBe('Rear')
})

it('when startFrom=null, excludes skipped items from queue', () => {
  const { getByTestId } = render(
    wrap(
      <CaptureFlowScreen
        {...defaultProps}
        skippedLabels={['Front']}
        startFrom={null}
      />
    )
  )
  // Front is skipped, queue should start at Rear
  expect(getByTestId('camera-label').props.children).toBe('Rear')
})

it('when startFrom is a label, includes it even if previously skipped', () => {
  const { getByTestId } = render(
    wrap(
      <CaptureFlowScreen
        {...defaultProps}
        skippedLabels={['Front']}
        startFrom="Front"
      />
    )
  )
  // Explicit startFrom overrides skip exclusion
  expect(getByTestId('camera-label').props.children).toBe('Front')
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/zanthrash/work/mater/mobile && npx jest --testPathPattern="CaptureFlowScreen" --no-coverage
```

Expected: Cannot find module `'../screens/CaptureFlowScreen'`

- [ ] **Step 3: Implement `CaptureFlowScreen`**

Create `mobile/src/screens/CaptureFlowScreen.tsx`:

```tsx
import React, { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CameraViewfinder } from '../components/CameraViewfinder'
import { PrimaryButton } from '../components/PrimaryButton'
import { useThemeColors, typography } from '../theme'
import type { AssetPhoto } from '../state/WizardStateManager'

type FlowState = 'camera' | 'interstitial'

export interface CaptureFlowScreenProps {
  checklist: string[]
  photos: AssetPhoto[]
  skippedLabels: string[]
  startFrom: string | null
  onPhotoCapture: (photo: AssetPhoto) => void
  onSkip: (label: string) => void
  onComplete: () => void
  onExit: () => void
}

function buildQueue(
  checklist: string[],
  photos: AssetPhoto[],
  skippedLabels: string[],
  startFrom: string | null
): string[] {
  const capturedLabels = new Set(
    photos.filter(p => p.type === 'guided').map(p => p.label)
  )
  const skippedSet = new Set(skippedLabels)
  const startIndex = startFrom != null ? checklist.indexOf(startFrom) : 0
  if (startIndex < 0) return []
  return checklist.slice(startIndex).filter(item => {
    if (capturedLabels.has(item)) return false
    // When startFrom=null (Start Capturing), skip previously-skipped items
    // When startFrom is a label (user tapped specific Capture), include it
    if (startFrom === null && skippedSet.has(item)) return false
    return true
  })
}

export function CaptureFlowScreen({
  checklist,
  photos,
  skippedLabels,
  startFrom,
  onPhotoCapture,
  onSkip,
  onComplete,
  onExit,
}: CaptureFlowScreenProps) {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const queue = useMemo(() => buildQueue(checklist, photos, skippedLabels, startFrom), [])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [flowState, setFlowState] = useState<FlowState>('camera')
  const [lastCapturedLabel, setLastCapturedLabel] = useState<string | null>(null)

  const currentLabel = queue[currentIndex] ?? null

  useEffect(() => {
    if (queue.length === 0) {
      onComplete()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhotoCapture = (base64: string) => {
    if (!currentLabel) return
    const uri = `data:image/jpeg;base64,${base64}`
    onPhotoCapture({ uri, base64, label: currentLabel, type: 'guided' })
    setLastCapturedLabel(currentLabel)
    const nextIndex = currentIndex + 1
    if (nextIndex >= queue.length) {
      onComplete()
    } else {
      setCurrentIndex(nextIndex)
      setFlowState('interstitial')
    }
  }

  const handleSkipFromCamera = () => {
    if (!currentLabel) return
    onSkip(currentLabel)
    const nextIndex = currentIndex + 1
    if (nextIndex >= queue.length) {
      onComplete()
    } else {
      setCurrentIndex(nextIndex)
      // Stay in camera state
    }
  }

  const handleSkipFromInterstitial = () => {
    if (!currentLabel) return
    onSkip(currentLabel)
    const nextIndex = currentIndex + 1
    if (nextIndex >= queue.length) {
      onComplete()
    } else {
      setCurrentIndex(nextIndex)
      setFlowState('camera')
    }
  }

  const handleReady = () => {
    setFlowState('camera')
  }

  const checklistPosition = currentLabel ? checklist.indexOf(currentLabel) + 1 : null

  if (flowState === 'camera') {
    return (
      <View style={styles.container} testID="capture-flow-camera">
        <CameraViewfinder
          onCapture={handlePhotoCapture}
          onCancel={onExit}
          label={currentLabel ?? undefined}
        />
        <View style={[styles.progressStrip, { bottom: 155 + insets.bottom }]}>
          <TouchableOpacity
            onPress={handleSkipFromCamera}
            style={styles.stripButton}
            testID="flow-skip-button"
          >
            <Text style={styles.stripButtonText}>Skip</Text>
          </TouchableOpacity>
          <Text style={styles.progressText}>
            {checklistPosition ?? '?'}/{checklist.length}
          </Text>
          <TouchableOpacity
            onPress={onExit}
            style={styles.stripButton}
            testID="flow-list-button"
          >
            <Ionicons name="list" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // Interstitial state
  return (
    <View
      style={[styles.interstitialContainer, { backgroundColor: colors.background }]}
      testID="capture-flow-interstitial"
    >
      <View style={styles.interstitialContent}>
        <View style={styles.confirmedRow}>
          <Ionicons name="checkmark-circle" size={32} color={colors.success} />
          <Text style={[styles.confirmedText, { color: colors.success, fontFamily: typography.bodyFamily }]}>
            {lastCapturedLabel} — saved
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.nextSection}>
          <Text style={[styles.nextLabel, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
            NEXT
          </Text>
          <Text style={[styles.nextItem, { color: colors.label, fontFamily: typography.headingFamily }]}>
            {currentLabel}
          </Text>
          <Text style={[styles.positionText, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
            {checklistPosition} of {checklist.length}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.interstitialFooter,
          {
            borderTopColor: colors.border,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 24,
          },
        ]}
      >
        <PrimaryButton
          title="Skip"
          onPress={handleSkipFromInterstitial}
          variant="secondary"
          testID="interstitial-skip-button"
          style={styles.footerButton}
        />
        <PrimaryButton
          title="Ready"
          onPress={handleReady}
          icon="arrow-forward"
          testID="interstitial-ready-button"
          style={styles.footerButton}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  stripButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  stripButtonText: {
    color: '#fff',
    ...typography.button,
  },
  progressText: {
    color: 'rgba(255,255,255,0.85)',
    ...typography.bodySmall,
  },
  interstitialContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  interstitialContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 32,
  },
  confirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  confirmedText: {
    fontSize: 20,
    lineHeight: 26,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 1,
  },
  nextSection: {
    alignItems: 'center',
    gap: 6,
  },
  nextLabel: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.5,
  },
  nextItem: {
    fontSize: 32,
    lineHeight: 40,
    textAlign: 'center',
  },
  positionText: {
    fontSize: 15,
    lineHeight: 20,
  },
  interstitialFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButton: {
    flex: 1,
  },
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/zanthrash/work/mater/mobile && npx jest --testPathPattern="CaptureFlowScreen" --no-coverage
```

Expected: all 14 tests pass

- [ ] **Step 5: Commit**

```bash
cd /Users/zanthrash/work/mater/mobile && git add src/screens/CaptureFlowScreen.tsx src/__tests__/CaptureFlowScreen.test.tsx && git commit -m "feat: add CaptureFlowScreen with auto-advance capture loop"
```

---

## Task 3: Update `GuidedPhotosScreen`

**Files:**
- Modify: `mobile/src/screens/GuidedPhotosScreen.tsx`
- Modify: `mobile/src/__tests__/GuidedPhotosScreen.test.tsx`

- [ ] **Step 1: Update test defaults and add failing tests**

Replace the `defaultProps` in `mobile/src/__tests__/GuidedPhotosScreen.test.tsx` and add new tests. The file should have:

**At top, add import for CaptureFlowScreen mock:**
```tsx
jest.mock('../screens/CaptureFlowScreen', () => ({
  CaptureFlowScreen: ({
    onComplete,
    onExit,
  }: {
    onComplete: () => void
    onExit: () => void
  }) => {
    const { TouchableOpacity, Text, View } = require('react-native')
    return (
      <View testID="capture-flow-screen">
        <TouchableOpacity testID="mock-flow-complete" onPress={onComplete}>
          <Text>Complete</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="mock-flow-exit" onPress={onExit}>
          <Text>Exit</Text>
        </TouchableOpacity>
      </View>
    )
  },
}))
```

**Update `defaultProps`:**
```ts
const defaultProps = {
  photoChecklist: ['Front', 'Rear'],
  photos: [] as AssetPhoto[],
  skippedLabels: [] as string[],
  onPhotosChange: jest.fn(),
  onSkippedLabelsChange: jest.fn(),
  onContinue: jest.fn(),
}
```

**Add new tests at the end of the file:**
```tsx
it('"Start Capturing" button is visible when there are uncaptured items', () => {
  const { getByTestId } = render(<GuidedPhotosScreen {...defaultProps} />)
  expect(getByTestId('start-capturing-button')).toBeTruthy()
})

it('"Start Capturing" button is hidden when all checklist items are captured', () => {
  const photos: AssetPhoto[] = [
    { uri: 'data:image/jpeg;base64,a', base64: 'a', label: 'Front', type: 'guided' },
    { uri: 'data:image/jpeg;base64,b', base64: 'b', label: 'Rear', type: 'guided' },
  ]
  const { queryByTestId } = render(
    <GuidedPhotosScreen {...defaultProps} photos={photos} />
  )
  expect(queryByTestId('start-capturing-button')).toBeNull()
})

it('pressing "Start Capturing" shows capture flow screen', () => {
  const { getByTestId } = render(<GuidedPhotosScreen {...defaultProps} />)
  fireEvent.press(getByTestId('start-capturing-button'))
  expect(getByTestId('capture-flow-screen')).toBeTruthy()
})

it('pressing individual "Capture" button enters capture flow from that item', () => {
  const { getByTestId } = render(<GuidedPhotosScreen {...defaultProps} />)
  fireEvent.press(getByTestId('capture-Rear'))
  expect(getByTestId('capture-flow-screen')).toBeTruthy()
})

it('flow exit returns to checklist', () => {
  const { getByTestId, queryByTestId } = render(<GuidedPhotosScreen {...defaultProps} />)
  fireEvent.press(getByTestId('start-capturing-button'))
  fireEvent.press(getByTestId('mock-flow-exit'))
  expect(queryByTestId('capture-flow-screen')).toBeNull()
  expect(getByTestId('start-capturing-button')).toBeTruthy()
})

it('flow complete returns to checklist', () => {
  const { getByTestId, queryByTestId } = render(<GuidedPhotosScreen {...defaultProps} />)
  fireEvent.press(getByTestId('start-capturing-button'))
  fireEvent.press(getByTestId('mock-flow-complete'))
  expect(queryByTestId('capture-flow-screen')).toBeNull()
})

it('skipped items show "Skipped" badge', () => {
  const { getByTestId } = render(
    <GuidedPhotosScreen {...defaultProps} skippedLabels={['Front']} />
  )
  expect(getByTestId('skipped-badge-Front')).toBeTruthy()
})

it('skipped items still show a "Capture" button to re-enter flow', () => {
  const { getByTestId } = render(
    <GuidedPhotosScreen {...defaultProps} skippedLabels={['Front']} />
  )
  expect(getByTestId('capture-Front')).toBeTruthy()
})
```

- [ ] **Step 2: Run tests to verify new ones fail**

```bash
cd /Users/zanthrash/work/mater/mobile && npx jest --testPathPattern="GuidedPhotosScreen" --no-coverage
```

Expected: multiple failures for missing `skippedLabels` prop and new testIDs

- [ ] **Step 3: Update `GuidedPhotosScreen`**

Replace the full contents of `mobile/src/screens/GuidedPhotosScreen.tsx` with:

```tsx
import React, { useState, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Image, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CameraViewfinder } from '../components/CameraViewfinder'
import { CaptureFlowScreen } from './CaptureFlowScreen'
import { WizardHeader } from '../components/WizardHeader'
import { PrimaryButton } from '../components/PrimaryButton'
import { AnimatedPressableButton } from '../components/AnimatedPressable'
import { useThemeColors, typography } from '../theme'
import type { AssetPhoto } from '../state/WizardStateManager'

interface Props {
  photoChecklist: string[]
  isChecklistLoading?: boolean
  photos: AssetPhoto[]
  skippedLabels: string[]
  onPhotosChange: (photos: AssetPhoto[]) => void
  onSkippedLabelsChange: (labels: string[]) => void
  onContinue: () => void
  onBack?: () => void
  onRestart?: () => void
}

const MIN_PHOTOS = 3

// Keyword-based grouping for AI-generated checklists
const CATEGORY_RULES: Array<{ label: string; keywords: string[] }> = [
  {
    label: 'Exterior Views',
    keywords: ['side', 'front', 'rear', 'profile', 'view', 'exterior', 'blade', 'ripper', 'counterweight', 'tail', 'push arm'],
  },
  {
    label: 'Interior & Mechanical',
    keywords: ['cab', 'interior', 'engine', 'hood', 'compartment', 'seat', 'control', 'monitor', 'filter', 'fluid', 'exhaust'],
  },
  {
    label: 'Detail & Documentation',
    keywords: ['undercarriage', 'track', 'sprocket', 'idler', 'roller', 'serial', 'id', 'plate', 'vin', 'grade', 'sensor', 'mast', 'receiver', 'cutting edge', 'wear', 'close'],
  },
]

function groupChecklist(items: string[]): Array<{ label: string; items: string[] }> {
  const groups: Record<string, string[]> = {}
  const ungrouped: string[] = []

  for (const item of items) {
    const lower = item.toLowerCase()
    const match = CATEGORY_RULES.find(rule => rule.keywords.some(kw => lower.includes(kw)))
    if (match) {
      if (!groups[match.label]) groups[match.label] = []
      groups[match.label].push(item)
    } else {
      ungrouped.push(item)
    }
  }

  const result: Array<{ label: string; items: string[] }> = []
  for (const rule of CATEGORY_RULES) {
    if (groups[rule.label]?.length) {
      result.push({ label: rule.label, items: groups[rule.label] })
    }
  }
  if (ungrouped.length) {
    result.push({ label: 'Other', items: ungrouped })
  }

  const groupedCount = result.reduce((sum, g) => sum + g.items.length, 0)
  if (result.length <= 1 || groupedCount < items.length * 0.6) {
    return [{ label: '', items }]
  }
  return result
}

function SkeletonRow() {
  const colors = useThemeColors()
  const shimmer = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [])

  return (
    <Animated.View style={[styles.row, { borderBottomColor: colors.separator }, { opacity: shimmer }]}>
      <View style={[styles.skeletonNumber, { backgroundColor: colors.border }]} />
      <View style={[styles.skeletonText, { backgroundColor: colors.surface }]} />
      <View style={[styles.skeletonButton, { backgroundColor: colors.surface }]} />
    </Animated.View>
  )
}

export function GuidedPhotosScreen({
  photoChecklist,
  isChecklistLoading = false,
  photos,
  skippedLabels,
  onPhotosChange,
  onSkippedLabelsChange,
  onContinue,
  onBack,
  onRestart,
}: Props) {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const [cameraOpen, setCameraOpen] = useState(false)
  const [currentLabel, setCurrentLabel] = useState<string | null>(null)
  const [retakeLabel, setRetakeLabel] = useState<string | null>(null)
  const [captureFlowActive, setCaptureFlowActive] = useState(false)
  const [captureFlowStartLabel, setCaptureFlowStartLabel] = useState<string | null>(null)

  // Single-photo retake (unchanged behavior)
  const handleRetake = (label: string) => {
    setCurrentLabel(label)
    setRetakeLabel(label)
    setCameraOpen(true)
  }

  const handleAddExtra = () => {
    setCurrentLabel(null)
    setRetakeLabel(null)
    setCameraOpen(true)
  }

  const handleCapture = (base64: string) => {
    const uri = `data:image/jpeg;base64,${base64}`
    if (retakeLabel !== null) {
      onPhotosChange(photos.map(p => p.label === retakeLabel ? { ...p, uri, base64 } : p))
    } else {
      onPhotosChange([...photos, { uri, base64, label: 'Extra', type: 'extra' as const }])
    }
    setCameraOpen(false)
    setCurrentLabel(null)
    setRetakeLabel(null)
  }

  const handleCancelCamera = () => {
    setCameraOpen(false)
    setCurrentLabel(null)
    setRetakeLabel(null)
  }

  const handleDelete = (label: string) => {
    onPhotosChange(photos.filter(p => !(p.type === 'guided' && p.label === label)))
  }

  const handleDeleteExtra = (index: number) => {
    const extraPhotos = photos.filter(p => p.type === 'extra')
    const target = extraPhotos[index]
    const targetIndex = photos.indexOf(target)
    onPhotosChange(photos.filter((_, i) => i !== targetIndex))
  }

  // Capture flow entry points
  const handleStartCapturing = () => {
    setCaptureFlowStartLabel(null)
    setCaptureFlowActive(true)
  }

  const handleCaptureChecklist = (label: string) => {
    setCaptureFlowStartLabel(label)
    setCaptureFlowActive(true)
  }

  const handleFlowPhotoCapture = (photo: AssetPhoto) => {
    onPhotosChange([...photos, photo])
  }

  const handleFlowSkip = (label: string) => {
    onSkippedLabelsChange([...skippedLabels, label])
  }

  const handleFlowComplete = () => {
    setCaptureFlowActive(false)
    setCaptureFlowStartLabel(null)
  }

  const handleFlowExit = () => {
    setCaptureFlowActive(false)
    setCaptureFlowStartLabel(null)
  }

  // Retake opens camera directly (single photo, no auto-advance)
  if (cameraOpen) {
    return (
      <CameraViewfinder
        onCapture={handleCapture}
        onCancel={handleCancelCamera}
        label={currentLabel ?? undefined}
      />
    )
  }

  // Capture flow (auto-advance)
  if (captureFlowActive) {
    return (
      <CaptureFlowScreen
        checklist={photoChecklist}
        photos={photos}
        skippedLabels={skippedLabels}
        startFrom={captureFlowStartLabel}
        onPhotoCapture={handleFlowPhotoCapture}
        onSkip={handleFlowSkip}
        onComplete={handleFlowComplete}
        onExit={handleFlowExit}
      />
    )
  }

  const capturedLabels = new Set(photos.filter(p => p.type === 'guided').map(p => p.label))
  const canContinue = photos.length >= MIN_PHOTOS
  const extraPhotos = photos.filter(p => p.type === 'extra')
  const guidedCaptured = photos.filter(p => p.type === 'guided').length
  const total = photoChecklist.length
  const groups = groupChecklist(photoChecklist)

  const hasUncapturedUnskipped = photoChecklist.some(
    item => !capturedLabels.has(item) && !skippedLabels.includes(item)
  )

  let globalIndex = 0

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
      <WizardHeader
        title="Capture Photos"
        showBack
        onBack={onBack}
        showMenu
        onRestart={onRestart}
        stepInfo={{ current: 4, total: 6 }}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row: instruction + progress fraction */}
        <View style={styles.instructionRow}>
          <Text style={[styles.instruction, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
            Capture each required photo.
          </Text>
          <View style={[styles.progressPill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[styles.progressPillText, { color: guidedCaptured >= total ? colors.success : colors.primary, fontFamily: typography.bodyFamily }]}>
              {guidedCaptured}/{total}
            </Text>
          </View>
        </View>

        {isChecklistLoading ? (
          <View style={[styles.checklistCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {[0, 1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}
          </View>
        ) : (
          groups.map((group, groupIndex) => (
            <View key={group.label || groupIndex} style={groupIndex > 0 ? { marginTop: 10 } : undefined}>
              {group.label ? (
                <Text style={[styles.sectionHeader, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
                  {group.label.toUpperCase()}
                </Text>
              ) : null}
              <View style={[styles.checklistCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {group.items.map(item => {
                  const itemNumber = ++globalIndex
                  const captured = photos.find(p => p.type === 'guided' && p.label === item)
                  const isSkipped = skippedLabels.includes(item)

                  if (captured) {
                    const imageUri = captured.uri || `data:image/jpeg;base64,${captured.base64}`
                    return (
                      <View
                        key={item}
                        style={[
                          styles.row,
                          styles.capturedRow,
                          { borderBottomColor: colors.separator, backgroundColor: colors.surfaceAlt, borderLeftColor: colors.success },
                        ]}
                      >
                        <View style={[styles.numberCircle, { backgroundColor: colors.success }]}>
                          <Ionicons name="checkmark" size={11} color="#fff" />
                        </View>
                        <Text style={[styles.itemLabel, styles.itemLabelCaptured, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
                          {item}
                        </Text>
                        <View style={styles.thumbnailWrapper}>
                          <Image
                            source={{ uri: imageUri }}
                            style={[styles.thumbnail, { backgroundColor: colors.surface }]}
                            testID={`thumbnail-${item}`}
                          />
                        </View>
                        <AnimatedPressableButton
                          style={[styles.iconButton, { backgroundColor: colors.surface }]}
                          onPress={() => handleRetake(item)}
                          testID={`retake-${item}`}
                        >
                          <Ionicons name="camera-reverse-outline" size={18} color={colors.primary} />
                        </AnimatedPressableButton>
                        <AnimatedPressableButton
                          style={[styles.iconButton, { backgroundColor: colors.errorBg }]}
                          onPress={() => handleDelete(item)}
                          testID={`delete-${item}`}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.error} />
                        </AnimatedPressableButton>
                      </View>
                    )
                  }

                  return (
                    <View key={item} style={[styles.row, { borderBottomColor: colors.separator }]}>
                      {isSkipped ? (
                        <View style={[styles.skippedBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} testID={`skipped-badge-${item}`}>
                          <Text style={[styles.skippedBadgeText, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
                            Skipped
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.numberCircle, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}>
                          <Text style={[styles.numberText, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
                            {itemNumber}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.itemLabel, { color: colors.label, fontFamily: typography.bodyFamily }]}>
                        {item}
                      </Text>
                      <AnimatedPressableButton
                        style={[styles.captureButton, { backgroundColor: isSkipped ? colors.surfaceAlt : colors.primary, borderWidth: isSkipped ? 1 : 0, borderColor: colors.border }]}
                        onPress={() => handleCaptureChecklist(item)}
                        testID={`capture-${item}`}
                      >
                        <Ionicons name="camera" size={16} color={isSkipped ? colors.secondary : colors.onPrimary} />
                        <Text style={[styles.captureButtonText, { color: isSkipped ? colors.secondary : colors.onPrimary, fontFamily: typography.bodyFamily }]}>
                          Capture
                        </Text>
                      </AnimatedPressableButton>
                    </View>
                  )
                })}
              </View>
            </View>
          ))
        )}

        {/* Extra photos section */}
        {extraPhotos.length > 0 && (
          <View style={[styles.checklistCard, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 10 }]}>
            {extraPhotos.map((photo, index) => {
              const imageUri = photo.uri || `data:image/jpeg;base64,${photo.base64}`
              return (
                <View key={`extra-${index}`} style={[styles.row, { borderBottomColor: colors.separator }]}>
                  <Text style={[styles.itemLabel, { color: colors.label, fontFamily: typography.bodyFamily }]}>
                    Extra {index + 1}
                  </Text>
                  <View style={styles.thumbnailWrapper}>
                    <Image
                      source={{ uri: imageUri }}
                      style={[styles.thumbnail, { backgroundColor: colors.surface }]}
                      testID={`thumbnail-extra-${index}`}
                    />
                  </View>
                  <AnimatedPressableButton
                    style={[styles.iconButton, { backgroundColor: colors.errorBg }]}
                    onPress={() => handleDeleteExtra(index)}
                    testID={`delete-extra-${index}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </AnimatedPressableButton>
                </View>
              )
            })}
          </View>
        )}

        <PrimaryButton
          title="Add Extra Photo"
          onPress={handleAddExtra}
          variant="secondary"
          icon="add"
          testID="add-extra-button"
          style={styles.addExtraButton}
        />
      </ScrollView>

      {/* Sticky footer */}
      <View
        style={[
          styles.stickyFooter,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
          },
        ]}
      >
        <View style={[styles.countBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Ionicons name="images-outline" size={14} color={colors.secondary} style={{ marginRight: 6 }} />
          <Text style={[styles.countText, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
            {photos.length} photo{photos.length !== 1 ? 's' : ''} captured
            {!canContinue && ` · need ${MIN_PHOTOS - photos.length} more`}
          </Text>
        </View>
        {hasUncapturedUnskipped && (
          <PrimaryButton
            title="Start Capturing"
            onPress={handleStartCapturing}
            icon="camera"
            testID="start-capturing-button"
          />
        )}
        <PrimaryButton
          title="Continue"
          onPress={onContinue}
          disabled={!canContinue}
          icon="arrow-forward"
          testID="continue-button"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  instruction: {
    ...typography.body,
    flex: 1,
  },
  progressPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginLeft: 8,
  },
  progressPillText: {
    ...typography.bodySmall,
  },
  sectionHeader: {
    ...typography.label,
    marginBottom: 6,
    marginLeft: 2,
  },
  checklistCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  capturedRow: {
    borderLeftWidth: 3,
  },
  numberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numberText: {
    ...typography.label,
  },
  itemLabel: {
    flex: 1,
    ...typography.body,
  },
  itemLabelCaptured: {
    ...typography.bodySmall,
  },
  thumbnailWrapper: {
    position: 'relative',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  captureButtonText: {
    ...typography.bodySmall,
  },
  skippedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
  },
  skippedBadgeText: {
    ...typography.label,
    fontSize: 11,
  },
  skeletonNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    flexShrink: 0,
  },
  skeletonText: {
    flex: 1,
    height: 14,
    borderRadius: 4,
    marginRight: 8,
  },
  skeletonButton: {
    width: 76,
    height: 34,
    borderRadius: 8,
  },
  addExtraButton: {
    marginTop: 12,
  },
  stickyFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  countText: {
    ...typography.bodySmall,
  },
})
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
cd /Users/zanthrash/work/mater/mobile && npx jest --testPathPattern="GuidedPhotosScreen" --no-coverage
```

Expected: all tests pass (original 6 + new 8 = 14 total)

- [ ] **Step 5: Commit**

```bash
cd /Users/zanthrash/work/mater/mobile && git add src/screens/GuidedPhotosScreen.tsx src/__tests__/GuidedPhotosScreen.test.tsx && git commit -m "feat: add capture flow entry points and skipped item badges to GuidedPhotosScreen"
```

---

## Task 4: Wire `skippedLabels` through `App.tsx`

**Files:**
- Modify: `mobile/src/App.tsx`

- [ ] **Step 1: Add `skippedLabels` state**

In `mobile/src/App.tsx`, add `skippedLabels` state alongside the other wizard state variables (near line 50):

```ts
const [skippedLabels, setSkippedLabels] = useState<string[]>([])
```

- [ ] **Step 2: Reset `skippedLabels` in `resetAll`**

In the `resetAll` function, add:

```ts
setSkippedLabels([])
```

The full `resetAll` becomes:

```ts
function resetAll() {
  setOverviewBase64(null)
  setVinData(null)
  setClassificationResult(null)
  setClassificationLoading(false)
  setConfirmedChecklist(null)
  setPhotos([])
  setSkippedLabels([])
  setAiSpecResult(null)
  setAiAnalysisLoading(false)
  setAiAnalysisError(false)
  setSubmitAsset(null)
  setHistory([])
  setScreen('home')
  stateManager.clearDraft()
  loadAssets()
}
```

- [ ] **Step 3: Restore `skippedLabels` from draft in `checkForDraft`**

In the `checkForDraft` Resume handler (around line 108), add after `if (latestDraft.photos) setPhotos(latestDraft.photos)`:

```ts
if (latestDraft.skippedLabels) setSkippedLabels(latestDraft.skippedLabels)
```

- [ ] **Step 4: Pass `skippedLabels` to `GuidedPhotosScreen`**

The `guided-photos` screen block (around line 342) currently renders:

```tsx
<GuidedPhotosScreen
  photoChecklist={checklist}
  isChecklistLoading={classificationLoading && !classificationResult}
  photos={photos}
  onPhotosChange={(updated) => {
    setPhotos(updated)
    stateManager.saveStep('guided-photos', { photos: updated })
  }}
  onContinue={async () => { ... }}
  onBack={goBack}
  onRestart={resetAll}
/>
```

Update it to:

```tsx
<GuidedPhotosScreen
  photoChecklist={checklist}
  isChecklistLoading={classificationLoading && !classificationResult}
  photos={photos}
  skippedLabels={skippedLabels}
  onPhotosChange={(updated) => {
    setPhotos(updated)
    stateManager.saveStep('guided-photos', { photos: updated })
  }}
  onSkippedLabelsChange={(updated) => {
    setSkippedLabels(updated)
    stateManager.saveStep('guided-photos', { skippedLabels: updated })
  }}
  onContinue={async () => {
    setAiAnalysisLoading(true)
    setAiAnalysisError(false)
    navigate('review')
    try {
      const taxonomy = classificationResult?.taxonomy
        ? {
            category: classificationResult.taxonomy.category,
            type: classificationResult.taxonomy.type,
            subtype: classificationResult.taxonomy.subtype,
          }
        : null
      const allPhotos = photos.map((p) => ({
        base64: p.base64 ?? '',
        type: p.type,
        mediaType: 'image/jpeg' as const,
      }))
      const result = await client.analyzeImages({ photos: allPhotos, taxonomy })
      setAiSpecResult(result)
      stateManager.saveStep('review', { aiSpecResult: result })
    } catch {
      setAiAnalysisError(true)
    } finally {
      setAiAnalysisLoading(false)
    }
  }}
  onBack={goBack}
  onRestart={resetAll}
/>
```

- [ ] **Step 5: Run the full test suite**

```bash
cd /Users/zanthrash/work/mater/mobile && npx jest --no-coverage
```

Expected: all test suites pass

- [ ] **Step 6: Commit**

```bash
cd /Users/zanthrash/work/mater/mobile && git add src/App.tsx && git commit -m "feat: wire skippedLabels state and draft persistence in App"
```

---

## Verification Checklist

After all tasks are complete, manually verify in the running app:

- [ ] Start intake → reach guided photos → "Start Capturing" button visible in footer
- [ ] "Start Capturing" → camera opens for first uncaptured item, progress strip shows position (e.g., "1/7") with Skip and list icon
- [ ] Take photo → "Use Photo" → interstitial shows "✓ Front — saved" + "Next: Rear" + "2 of 7"
- [ ] "Ready" → camera for Rear
- [ ] "Skip" on interstitial → calls skip, goes to camera for next item
- [ ] "Skip" on camera → skips current item, goes to camera for next item
- [ ] List icon on camera → returns to checklist; skipped items show "Skipped" badge + "Capture" button
- [ ] "Capture" on a specific skipped item → flow starts from that item (skip exclusion bypassed)
- [ ] Complete all items → returns to checklist summary
- [ ] Retake → single-photo retake, returns to checklist, no auto-advance
- [ ] Kill app and resume → skipped labels are restored from draft
