package model

// KeypointExt represents the keypoint_ext model.
type KeypointExt struct {
	KeypointID        uint   `json:"keypoint_id" gorm:"primaryKey"`
	Coordinate        string `json:"coordinate"`
	Alamat            string `json:"alamat"`
	ParentStationpoints string `json:"parent_stationpoints"`
}
