package repository

import (
	"go-backend-pln-monitoring/internal/model"
	"gorm.io/gorm"
)

type UserRepository interface {
	GetByID(id uint) (model.User, error)
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db}
}

func (r *userRepository) GetByID(id uint) (model.User, error) {
	var user model.User
	err := r.db.First(&user, id).Error
	return user, err
}
