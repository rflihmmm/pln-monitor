package model

// GarduInduk represents the gardu_induk model.
type GarduInduk struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	Name        string `json:"name"`
	Coordinate  string `json:"coordinate"`
	KeypointID  string `json:"keypoint_id"`
	Description string `json:"description"`
}
