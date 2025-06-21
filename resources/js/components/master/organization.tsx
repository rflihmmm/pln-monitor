import KendoGrid from "@/components/ui/kendo-grid";
import { popup } from "leaflet";


export default function Organization() {

    const datas = [
        {
            "id": 0,
            "dcc": "TENGGARA",
            "up3": "KENDARI",
            "ulp": "KOLAKA",
            "gardu_induk": "PARE-PARE",
            "feeder": "WAJO",
            "keypoint": "REC-WAJO",
            "coordinate": "-4.000000, 120.000000"
        },
        {
            "id": 1,
            "dcc": "UTARA",
            "up3": "KENDARI",
            "ulp": "KOLAKA",
            "gardu_induk": "PANKEP",
            "feeder": "PANGKAJENE",
            "keypoint": "REC-PANGKEP",
            "coordinate": "-4.000000, 120.000000"
        },
        {
            "id": 2,
            "dcc": "TENGGARA",
            "up3": "KENDARI",
            "ulp": "KOLAKA",
            "gardu_induk": "PARE-PARE",
            "feeder": "WAJO",
            "keypoint": "REC-WAJO",
            "coordinate": "-4.000000, 120.000000"
        },
        {
            "id": 3,
            "dcc": "TENGGARA",
            "up3": "KENDARI",
            "ulp": "KOLAKA",
            "gardu_induk": "PARE-PARE",
            "feeder": "WAJO",
            "keypoint": "REC-WAJO",
            "coordinate": "-4.000000, 120.000000"
        },
        {
            "id": 4,
            "dcc": "SELATAN",
            "up3": "KENDARI",
            "ulp": "KOLAKA",
            "gardu_induk": "PARE-PARE",
            "feeder": "WAJO",
            "keypoint": "REC-WAJO",
            "coordinate": "-4.000000, 120.000000"
        }
    ]

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
            field: "ulp"
        }, {
            title: "UP3",
            width: "100px",
            field: "up3"
        }, {
            title: "DCC",
            width: "100px",
            field: "dcc"
        }, {
            title: "Coordinate",
            width: "100px",
            field: "coordinate"
        }],
        dataSource: {
            //data: "https://localhost:8000/master/organization-grid",
            data: datas,
            pageSize: 10,
            pageable: true,
            sortable: true,
            filtertable: true,
            resizetable: true,
            editable: "popup",
            scrollable: true,
            total: 0,
            group: [{
                field: "dcc"
            }, {
                field: "up3"
            }, {
                field: "ulp"
            }]
        }
    }
    return (
        <div className="space-y-4">

            <KendoGrid
                config={config}
            />
        </div>
    );
}