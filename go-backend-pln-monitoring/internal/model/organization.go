package model

// Organization represents the organization model.
type Organization struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	Name       string `json:"name"`
	Level      int    `json:"level"`
	ParentID   *uint  `json:"parent_id"`
	Address    string `json:"address"`
	Coordinate string `json:"coordinate"`
}
