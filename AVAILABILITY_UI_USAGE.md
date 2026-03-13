# AvailabilityUI Component

## Description
A reusable component for managing candidate availability and priority status.

## Location
`/apps/web/src/components/AvailabilityUI.tsx`

## Features
- Toggle immediate availability status
- Set notice period (days) when not immediately available
- Mark candidates as priority with a star icon
- Visual status summary with chips

## Usage Example

```tsx
import AvailabilityUI from "@/components/AvailabilityUI";

// In your page/component
function CandidateDetailPage() {
  const [candidate, setCandidate] = useState({
    immediatelyAvailable: false,
    noticePeriodDays: 30,
    isPriority: false,
  });

  const handleToggleAvailability = async (currentValue: boolean) => {
    // API call to update
    await api.patch(`/api/candidates/${id}/availability`, {
      immediatelyAvailable: !currentValue,
    });
    // Update local state
    setCandidate({ ...candidate, immediatelyAvailable: !currentValue });
  };

  const handleUpdateNoticePeriod = async (days: number) => {
    await api.patch(`/api/candidates/${id}/notice-period`, {
      noticePeriodDays: days,
    });
    setCandidate({ ...candidate, noticePeriodDays: days });
  };

  const handleTogglePriority = async (currentValue: boolean) => {
    await api.patch(`/api/candidates/${id}/priority`, {
      isPriority: !currentValue,
    });
    setCandidate({ ...candidate, isPriority: !currentValue });
  };

  return (
    <div>
      {/* Other content */}
      
      <AvailabilityUI
        candidate={candidate}
        onToggleImmediateAvailability={handleToggleAvailability}
        onUpdateNoticePeriod={handleUpdateNoticePeriod}
        onTogglePriority={handleTogglePriority}
      />
      
      {/* More content */}
    </div>
  );
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `candidate` | `CandidateAvailability \| null \| undefined` | Candidate object with availability data |
| `onToggleImmediateAvailability` | `(currentValue: boolean) => void` | Callback when availability toggle is clicked |
| `onUpdateNoticePeriod` | `(days: number) => void` | Callback when notice period is updated |
| `onTogglePriority` | `(currentValue: boolean) => void` | Callback when priority button is clicked |

## CandidateAvailability Interface

```typescript
interface CandidateAvailability {
  immediatelyAvailable?: boolean;
  noticePeriodDays?: number;
  isPriority?: boolean;
}
```

## Next Steps

To integrate this into your candidate review page:

1. Import the component in your page
2. Implement the backend API endpoints for updating:
   - Immediate availability
   - Notice period
   - Priority status
3. Add the component to your page layout
4. Wire up the callback functions to make API calls
