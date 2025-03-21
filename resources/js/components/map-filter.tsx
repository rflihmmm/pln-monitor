import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface MapFilterProps {
    currentFilter: "GI" | "GH" | "ALL"
    onFilterChange: (filter: "GI" | "GH" | "ALL") => void
}

export default function MapFilter({ currentFilter, onFilterChange }: MapFilterProps) {
    return (
        <ToggleGroup
            type="single"
            value={currentFilter}
            onValueChange={(value) => value && onFilterChange(value as "GI" | "GH" | "ALL")}
        >
            <ToggleGroupItem value="ALL" aria-label="Show all substations">
                ALL
            </ToggleGroupItem>
            <ToggleGroupItem value="GI" aria-label="Show only Gardu Induk">
                GI
            </ToggleGroupItem>
            <ToggleGroupItem value="GH" aria-label="Show only Gardu Hubung">
                GH
            </ToggleGroupItem>
        </ToggleGroup>
    )
}


