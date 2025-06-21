import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react"
import "@progress/kendo-ui/css/web/kendo.default-v2.min.css"
import "@progress/kendo-ui/js/kendo.all.min.js"

interface KendoGridColumn {
  field?: string
  title: string
  width?: number
  columns?: KendoGridColumn[]
}

interface KendoGridProps {
  config: any
}

interface KendoGridRef {
  getKendoWidget: () => any
  refresh: () => void
  getSelectedData: () => any[]
  clearSelection: () => void
  selectRow: (index: number) => void
  addRow: (data: any) => void
  removeRow: (index: number) => void
  saveChanges: () => void
  cancelChanges: () => void
  exportToExcel: () => void
  showColumn: (field: string) => void
  hideColumn: (field: string) => void
  setDataSource: (data: any[]) => void
  getDataSource: () => any
  reload: () => void
}

const KendoGrid = forwardRef<KendoGridRef, KendoGridProps>(
  ({ config }, ref) => {
    const gridRef = useRef<HTMLDivElement>(null)
    const kendoGridRef = useRef<any>(null)

    useEffect(() => {
      if (!gridRef.current) return

      const $grid = window.kendo.jQuery(gridRef.current)
      $grid.kendoGrid(config)
      kendoGridRef.current = $grid.data("kendoGrid")

      return () => {
        if (kendoGridRef.current) {
          try {
            kendoGridRef.current.destroy()
          } catch (error) {
            console.error("Error destroying Kendo Grid:", error)
          }
        }
      }
    }, [config])

    useImperativeHandle(
      ref,
      () => ({
        getKendoWidget: () => kendoGridRef.current,

        refresh: () => {
          kendoGridRef.current?.refresh()
        },

        getSelectedData: () => {
          if (!kendoGridRef.current) return []
          const selectedRows = kendoGridRef.current.select()
          const selectedData: any[] = []
          selectedRows.each((_: number, row: any) => {
            selectedData.push(kendoGridRef.current.dataItem(row))
          })
          return selectedData
        },

        clearSelection: () => {
          kendoGridRef.current?.clearSelection()
        },

        selectRow: (index: number) => {
          const grid = kendoGridRef.current
          if (grid) {
            const row = grid.tbody.find(`tr:eq(${index})`)
            grid.select(row)
          }
        },

        addRow: (data: any) => {
          kendoGridRef.current?.dataSource.add(data)
        },

        removeRow: (index: number) => {
          const grid = kendoGridRef.current
          if (grid) {
            const dataItem = grid.dataSource.at(index)
            grid.dataSource.remove(dataItem)
          }
        },

        saveChanges: () => {
          kendoGridRef.current?.saveChanges()
        },

        cancelChanges: () => {
          kendoGridRef.current?.cancelChanges()
        },

        exportToExcel: () => {
          kendoGridRef.current?.saveAsExcel()
        },

        showColumn: (field: string) => {
          kendoGridRef.current?.showColumn(field)
        },

        hideColumn: (field: string) => {
          kendoGridRef.current?.hideColumn(field)
        },

        setDataSource: (data: any[]) => {
          const grid = kendoGridRef.current
          if (grid && grid.dataSource) {
            grid.dataSource.data(data)
          }
        },

        getDataSource: () => {
          return kendoGridRef.current?.dataSource
        },

        reload: () => {
          kendoGridRef.current?.dataSource.read()
        },
      }),
      []
    )

    return <div ref={gridRef} />
  }
)

KendoGrid.displayName = "KendoGrid"

export default KendoGrid
export type { KendoGridColumn, KendoGridRef }