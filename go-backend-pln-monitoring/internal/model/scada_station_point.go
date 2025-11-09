package model

import "time"

type ScadaStationPoint struct {
	PKEY     uint       `json:"PKEY"`
	Name     string     `json:"NAME"`
	Time     time.Time  `json:"UPDATETIME"`
	Desc 	 string     `json:"DESC"`
}
