package model

import "time"

type ScadaAlarm struct {
	PKEY        uint       `json:"PKEY"`
	Text        string     `json:"TEXT"`
	Time        time.Time  `json:"TIME"`
	Priority    uint       `json:"PRIORITY"`
	StationPID  uint       `json:"STATIONPID"`
}
