package model

// FeederStatusPoint represents the feeder_status_point model.
type FeederStatusPoint struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	Type     string `json:"type"`
	StatusID string `json:"status_id"`
	FeederID uint   `json:"feeder_id"`
	Name     string `json:"name"`
}
