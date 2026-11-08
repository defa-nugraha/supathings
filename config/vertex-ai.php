<?php

return [
    'enabled' => (bool) env('VERTEX_AI_ENABLED', false),
    'project_id' => env('VERTEX_AI_PROJECT_ID'),
    'location' => env('VERTEX_AI_LOCATION', 'global'),
    'model' => env('VERTEX_AI_MODEL', 'gemini-3.8-flash'),
    'service_account_json_base64' => env('VERTEX_AI_SERVICE_ACCOUNT_JSON_BASE64'),
    'access_token' => env('VERTEX_AI_ACCESS_TOKEN'),
    'timeout' => (int) env('VERTEX_AI_TIMEOUT', 45),
    'analysis_window_hours' => (int) env('VERTEX_AI_ANALYSIS_WINDOW_HOURS', 24),
];
