package model

import "time"

type ScadaStatusPoint struct {
	PKEY        uint       `json:"PKEY"`
	StationPID  uint       `json:"STATIONPID"`
	Name        string     `json:"NAME"`
	Time        time.Time  `json:"UPDATETIME"`
	Value      float64    `json:"VALUE"`
	Taglevel	uint	   `json:"TAGLEVEL"`
	Condcodeid  uint       `json:"CONDCODEID"`
}
