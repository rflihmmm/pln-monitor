import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface MapFilterProps {
    currentFilter: 'Active' | 'Inactive' | 'ALL';
    onFilterChange: (filter: 'Active' | 'Inactive' | 'ALL') => void;
}

export default function MapFilter({ currentFilter, onFilterChange }: MapFilterProps) {
    return (
        <ToggleGroup type="single" value={currentFilter} onValueChange={(value) => value && onFilterChange(value as 'Active' | 'Inactive' | 'ALL')} className='bg-white'>
            <ToggleGroupItem value="ALL" aria-label="Show all substations">
                ALL
            </ToggleGroupItem>
            <ToggleGroupItem value="Active" aria-label="Show only Active">
                Active
            </ToggleGroupItem>
            <ToggleGroupItem value="Inactive" aria-label="Show only Inactive">
                Inactive
            </ToggleGroupItem>
        </ToggleGroup>
    );
}
