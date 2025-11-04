package model

// OrganizationKeypoint represents the organization_keypoint model.
type OrganizationKeypoint struct {
	ID             uint `json:"id" gorm:"primaryKey"`
	KeypointID     uint `json:"keypoint_id"`
	OrganizationID uint `json:"organization_id"`
}
