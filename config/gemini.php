<?php

return [
    'enabled' => (bool) env('GEMINI_ENABLED', false),
    'api_key' => env('GEMINI_API_KEY'),
    'model' => env('GEMINI_MODEL', 'gemini-2.5-flash'),
    'connect_timeout' => (int) env('GEMINI_CONNECT_TIMEOUT', 10),
    'timeout' => (int) env('GEMINI_TIMEOUT', 60),
    'analysis_window_hours' => (int) env('GEMINI_ANALYSIS_WINDOW_HOURS', 24),
];
