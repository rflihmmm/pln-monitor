package model

// Feeder represents the feeder model.
type Feeder struct {
	ID             uint   `json:"id" gorm:"primaryKey"`
	Name           string `json:"name"`
	Description    string `json:"description"`
	KeywordAnalogs string `json:"keyword_analogs"`
	GarduIndukID   uint   `json:"gardu_induk_id"`
}
