package model

import "time"

// User represents the user model.
type User struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	Name            string    `json:"name"`
	Email           string    `json:"email" gorm:"unique"`
	Password        string    `json:"-"`
	Unit            string    `json:"unit"`
	EmailVerifiedAt time.Time `json:"email_verified_at"`
	RememberToken   string    `json:"-"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}
