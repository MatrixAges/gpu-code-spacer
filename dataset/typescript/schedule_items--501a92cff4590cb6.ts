export default {
      "Schedule.TimelineAngle": {
            "type": "object",
            "properties": {
                  "id": {
                        "type": "string"
                  },
                  "text": {
                        "type": "string"
                  },
                  "rows": {
                        "type": "array",
                        "items": {
                              "type": "string"
                        }
                  }
            },
            "required": [
                  "id",
                  "text",
                  "rows"
            ]
      },
      "Schedule.Setting": {
            "type": "object",
            "properties": {
                  "tags": {
                        "type": "array",
                        "items": {
                              "type": "object",
                              "properties": {
                                    "id": {
                                          "type": "string"
                                    },
                                    "color": {
                                          "type": "string"
                                    },
                                    "text": {
                                          "type": "string"
                                    }
                              },
                              "required": [
                                    "id",
                                    "color",
                                    "text"
                              ]
                        }
                  },
                  "timeline_angles": {
                        "type": "array",
                        "items": {
                              "type": "object",
                              "properties": {
                                    "id": {
                                          "type": "string"
                                    },
                                    "text": {
                                          "type": "string"
                                    },
                                    "rows": {
                                          "type": "array",
                                          "items": {
                                                "type": "string"
                                          }
                                    }
                              },
                              "required": [
                                    "id",
                                    "text",
                                    "rows"
                              ]
                        }
                  }
            },
            "required": [
                  "tags",
                  "timeline_angles"
            ]
      },
      "Tag": {
            "type": "object",
            "properties": {
                  "id": {
                        "type": "string"
                  },
                  "color": {
                        "type": "string"
                  },
                  "text": {
                        "type": "string"
                  }
            },
            "required": [
                  "id",
                  "color",
                  "text"
            ]
      },
      "Schedule.ScheduleSetting": {
            "type": "object",
            "properties": {
                  "file_id": {
                        "type": "string"
                  },
                  "module": {
                        "type": "string"
                  },
                  "setting": {
                        "type": "object",
                        "properties": {
                              "tags": {
                                    "type": "array",
                                    "items": {
                                          "type": "object",
                                          "properties": {
                                                "id": {
                                                      "type": "string"
                                                },
                                                "color": {
                                                      "type": "string"
                                                },
                                                "text": {
                                                      "type": "string"
                                                }
                                          },
                                          "required": [
                                                "id",
                                                "color",
                                                "text"
                                          ]
                                    }
                              },
                              "timeline_angles": {
                                    "type": "array",
                                    "items": {
                                          "type": "object",
                                          "properties": {
                                                "id": {
                                                      "type": "string"
                                                },
                                                "text": {
                                                      "type": "string"
                                                },
                                                "rows": {
                                                      "type": "array",
                                                      "items": {
                                                            "type": "string"
                                                      }
                                                }
                                          },
                                          "required": [
                                                "id",
                                                "text",
                                                "rows"
                                          ]
                                    }
                              }
                        },
                        "required": [
                              "tags",
                              "timeline_angles"
                        ]
                  }
            },
            "required": [
                  "file_id",
                  "module",
                  "setting"
            ]
      },
      "Schedule.Item": {
            "type": "object",
            "properties": {
                  "id": {
                        "type": "string",
                        "maxLength": 30
                  },
                  "file_id": {
                        "type": "string",
                        "maxLength": 30
                  },
                  "type": {
                        "type": "string",
                        "enum": [
                              "calendar",
                              "timeline",
                              "fixed"
                        ]
                  },
                  "tag": {
                        "type": "string",
                        "maxLength": 30
                  },
                  "text": {
                        "type": "string"
                  },
                  "todos": {
                        "type": "array",
                        "items": {
                              "type": "string"
                        }
                  },
                  "start_time": {
                        "type": "number",
                        "multipleOf": 1,
                        "minimum": 1,
                        "maximum": 9007199254740991
                  },
                  "end_time": {
                        "type": "number",
                        "multipleOf": 1,
                        "minimum": 1,
                        "maximum": 9007199254740991
                  },
                  "fixed_scale": {
                        "type": "string",
                        "enum": [
                              "day",
                              "week",
                              "month",
                              "year"
                        ]
                  },
                  "timeline_angle_id": {
                        "type": "string",
                        "maxLength": 30
                  },
                  "timeline_angle_row_id": {
                        "type": "string",
                        "maxLength": 30
                  },
                  "timeline_year": {
                        "type": "boolean"
                  },
                  "remark": {
                        "type": "string"
                  },
                  "create_at": {
                        "type": "number"
                  },
                  "update_at": {
                        "type": "number"
                  },
                  "extends": {
                        "type": "string"
                  }
            },
            "required": [
                  "id",
                  "file_id",
                  "type",
                  "tag",
                  "text",
                  "todos",
                  "start_time",
                  "end_time"
            ]
      },
      "Schedule.CalendarItem": {
            "type": "object",
            "properties": {
                  "start": {
                        "type": "number"
                  },
                  "length": {
                        "type": "number"
                  },
                  "past": {
                        "type": "boolean"
                  },
                  "raw_start_time": {
                        "type": "number"
                  },
                  "raw_end_time": {
                        "type": "number"
                  },
                  "id": {
                        "type": "string",
                        "maxLength": 30
                  },
                  "file_id": {
                        "type": "string",
                        "maxLength": 30
                  },
                  "type": {
                        "type": "string",
                        "enum": [
                              "calendar",
                              "timeline",
                              "fixed"
                        ]
                  },
                  "tag": {
                        "type": "string",
                        "maxLength": 30
                  },
                  "text": {
                        "type": "string"
                  },
                  "todos": {
                        "type": "array",
                        "items": {
                              "type": "string"
                        }
                  },
                  "start_time": {
                        "type": "number",
                        "multipleOf": 1,
                        "minimum": 1,
                        "maximum": 9007199254740991
                  },
                  "end_time": {
                        "type": "number",
                        "multipleOf": 1,
                        "minimum": 1,
                        "maximum": 9007199254740991
                  },
                  "fixed_scale": {
                        "type": "string",
                        "enum": [
                              "day",
                              "week",
                              "month",
                              "year"
                        ]
                  },
                  "timeline_angle_id": {
                        "type": "string",
                        "maxLength": 30
                  },
                  "timeline_angle_row_id": {
                        "type": "string",
                        "maxLength": 30
                  },
                  "timeline_year": {
                        "type": "boolean"
                  },
                  "remark": {
                        "type": "string"
                  },
                  "create_at": {
                        "type": "number"
                  },
                  "update_at": {
                        "type": "number"
                  },
                  "extends": {
                        "type": "string"
                  }
            },
            "required": [
                  "end_time",
                  "file_id",
                  "id",
                  "length",
                  "past",
                  "start",
                  "start_time",
                  "tag",
                  "text",
                  "todos",
                  "type"
            ]
      },
      "Schedule.CalendarDay": {
            "type": "array",
            "items": {
                  "type": "object",
                  "properties": {
                        "start": {
                              "type": "number"
                        },
                        "length": {
                              "type": "number"
                        },
                        "past": {
                              "type": "boolean"
                        },
                        "raw_start_time": {
                              "type": "number"
                        },
                        "raw_end_time": {
                              "type": "number"
                        },
                        "id": {
                              "type": "string",
                              "maxLength": 30
                        },
                        "file_id": {
                              "type": "string",
                              "maxLength": 30
                        },
                        "type": {
                              "type": "string",
                              "enum": [
                                    "calendar",
                                    "timeline",
                                    "fixed"
                              ]
                        },
                        "tag": {
                              "type": "string",
                              "maxLength": 30
                        },
                        "text": {
                              "type": "string"
                        },
                        "todos": {
                              "type": "array",
                              "items": {
                                    "type": "string"
                              }
                        },
                        "start_time": {
                              "type": "number",
                              "multipleOf": 1,
                              "minimum": 1,
                              "maximum": 9007199254740991
                        },
                        "end_time": {
                              "type": "number",
                              "multipleOf": 1,
                              "minimum": 1,
                              "maximum": 9007199254740991
                        },
                        "fixed_scale": {
                              "type": "string",
                              "enum": [
                                    "day",
                                    "week",
                                    "month",
                                    "year"
                              ]
                        },
                        "timeline_angle_id": {
                              "type": "string",
                              "maxLength": 30
                        },
                        "timeline_angle_row_id": {
                              "type": "string",
                              "maxLength": 30
                        },
                        "timeline_year": {
                              "type": "boolean"
                        },
                        "remark": {
                              "type": "string"
                        },
                        "create_at": {
                              "type": "number"
                        },
                        "update_at": {
                              "type": "number"
                        },
                        "extends": {
                              "type": "string"
                        }
                  },
                  "required": [
                        "end_time",
                        "file_id",
                        "id",
                        "length",
                        "past",
                        "start",
                        "start_time",
                        "tag",
                        "text",
                        "todos",
                        "type"
                  ]
            }
      },
      "Schedule.CalendarDays": {
            "type": "array",
            "items": {
                  "type": "array",
                  "items": {
                        "type": "object",
                        "properties": {
                              "start": {
                                    "type": "number"
                              },
                              "length": {
                                    "type": "number"
                              },
                              "past": {
                                    "type": "boolean"
                              },
                              "raw_start_time": {
                                    "type": "number"
                              },
                              "raw_end_time": {
                                    "type": "number"
                              },
                              "id": {
                                    "type": "string",
                                    "maxLength": 30
                              },
                              "file_id": {
                                    "type": "string",
                                    "maxLength": 30
                              },
                              "type": {
                                    "type": "string",
                                    "enum": [
                                          "calendar",
                                          "timeline",
                                          "fixed"
                                    ]
                              },
                              "tag": {
                                    "type": "string",
                                    "maxLength": 30
                              },
                              "text": {
                                    "type": "string"
                              },
                              "todos": {
                                    "type": "array",
                                    "items": {
                                          "type": "string"
                                    }
                              },
                              "start_time": {
                                    "type": "number",
                                    "multipleOf": 1,
                                    "minimum": 1,
                                    "maximum": 9007199254740991
                              },
                              "end_time": {
                                    "type": "number",
                                    "multipleOf": 1,
                                    "minimum": 1,
                                    "maximum": 9007199254740991
                              },
                              "fixed_scale": {
                                    "type": "string",
                                    "enum": [
                                          "day",
                                          "week",
                                          "month",
                                          "year"
                                    ]
                              },
                              "timeline_angle_id": {
                                    "type": "string",
                                    "maxLength": 30
                              },
                              "timeline_angle_row_id": {
                                    "type": "string",
                                    "maxLength": 30
                              },
                              "timeline_year": {
                                    "type": "boolean"
                              },
                              "remark": {
                                    "type": "string"
                              },
                              "create_at": {
                                    "type": "number"
                              },
                              "update_at": {
                                    "type": "number"
                              },
                              "extends": {
                                    "type": "string"
                              }
                        },
                        "required": [
                              "end_time",
                              "file_id",
                              "id",
                              "length",
                              "past",
                              "start",
                              "start_time",
                              "tag",
                              "text",
                              "todos",
                              "type"
                        ]
                  }
            }
      }
} as const