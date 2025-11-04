package model

// FeederKeypoint represents the feeder_keypoint model.
type FeederKeypoint struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	KeypointID string `json:"keypoint_id"`
	FeederID   uint   `json:"feeder_id"`
	Name       string `json:"name"`
}
