package model

import "time"

type ScadaAnalogPoint struct {
	PKEY        uint       `json:"PKEY"`
	StationPID  uint       `json:"STATIONPID"`
	Name        string     `json:"NAME"`
	Time       time.Time  `json:"UPDATETIME"`
	Value      float64    `json:"VALUE"`
	Condcodeid  uint       `json:"CONDCODEID"`
}
