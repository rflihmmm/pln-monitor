import KendoGrid from "@/components/ui/kendo-grid";
import { useEffect, useState } from "react";
import { popup } from "leaflet";


export default function Organization() {
    const config = {
        columns: [{
            title: "Keypoint",
            width: "100px",
            field: "keypoint"
        }, {
            title: "Feeder",
            width: "100px",
            field: "feeder"
        }, {
            title: "Gardu Induk",
            width: "100px",
            field: "gardu_induk"
        }, {
            title: "ULP",
            width: "100px",
            field: "ulp",
            editor: ulpDropdownEditor
        }, {
            title: "UP3",
            width: "100px",
            field: "up3",
            editor: up3DropdownEditor
        }, {
            title: "DCC",
            width: "100px",
            field: "dcc",
            editor: dccDropdownEditor
        }, {
            title: "Coordinate",
            width: "100px",
            field: "coordinate"
        }, {
            command: "destroy",
            title: "&nbsp;",
            width: "80px"
        }],
        dataSource: {
            transport: {
                read: {
                    url: "organization-grid",
                    dataType: "json",
                },
                create: {
                    url: "organization-grid/post",
                    type: "POST",
                    contentType: "application/json",
                },
                destroy: {
                    url: "organization-grid",
                    type: "DELETE",
                    contentType: "application/json",
                }
            },
            pageSize: 10,
            pageable: true,
            sortable: true,
            filterable: true,
            resizable: true,
            //editable: "popup",
            scrollable: true,
            total: 0,
            group: [{
                field: "dcc"
            }, {
                field: "up3"
            }, {
                field: "ulp"
            }
            ],
            //batch: true,
        },
        editable: true,
        toolbar: ["create", "save", "cancel"],
    }

    function dccDropdownEditor(container: HTMLElement, options: any) {
        window.kendo.jQuery('<input data-bind="value:' + options.field + '" />')
            .appendTo(container)
            .kendoDropDownList({
                dataTextField: "name",
                dataValueField: "id",
                filter: "contains",
                dataSource: {
                    transport: {
                        read: "organization-grid/dcc"
                    }
                }
            });
    }
    function up3DropdownEditor(container: HTMLElement, options: any) {
        window.kendo.jQuery('<input data-bind="value:' + options.field + '" />')
            .appendTo(container)
            .kendoDropDownList({
                dataTextField: "name",
                dataValueField: "id",
                filter: "contains",
                dataSource: {
                    transport: {
                        read: "organization-grid/up3"
                    }
                }
            });
    }
    function ulpDropdownEditor(container: HTMLElement, options: any) {
        window.kendo.jQuery('<input data-bind="value:' + options.field + '" />')
            .appendTo(container)
            .kendoDropDownList({
                dataTextField: "name",
                dataValueField: "id",
                filter: "contains",
                dataSource: {
                    transport: {
                        read: "organization-grid/ulp"
                    }
                }
            });
    }
    return (
        <div className="space-y-4">

            <KendoGrid
                config={config}
            />
        </div>
    );
}