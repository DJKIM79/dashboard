<?php
/**
 * OnTo Synchronization Backend
 * Handles saving and loading of user configuration.
 */

header('Content-Type: application/json');

// User Authentication - Read from user/users.txt (Format: id password)
$usersFile = __DIR__ . '/user/users.txt';
$allowedUsers = [];
if (file_exists($usersFile)) {
    $lines = file($usersFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $parts = preg_split('/\s+/', trim($line));
        if (count($parts) >= 2) {
            $allowedUsers[$parts[0]] = $parts[1];
        }
    }
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';
$id = $_POST['id'] ?? $_GET['id'] ?? '';
$authKey = $_POST['authKey'] ?? $_GET['authKey'] ?? ''; // This is now the password

if (!$id || !isset($allowedUsers[$id])) {
    echo json_encode(['success' => false, 'message' => 'Invalid ID']);
    exit;
}

if ($authKey !== $allowedUsers[$id]) {
    echo json_encode(['success' => false, 'message' => 'Invalid Password']);
    exit;
}

$userDir = __DIR__ . '/user/' . $id;
$configFile = $userDir . '/config.json';

if ($action === 'save') {
    $data = $_POST['data'] ?? '';
    if (!$data) {
        echo json_encode(['success' => false, 'message' => 'No data provided']);
        exit;
    }

    $decoded = json_decode($data, true);
    if (!is_array($decoded)) {
        $decoded = [];
    }
    // Set absolute server timestamp in milliseconds
    $serverTimeMs = round(microtime(true) * 1000);
    $decoded['dj_last_updated'] = (string)$serverTimeMs;
    $data = json_encode($decoded);

    if (!is_dir($userDir)) {
        if (!mkdir($userDir, 0755, true)) {
            echo json_encode(['success' => false, 'message' => 'Failed to create user directory']);
            exit;
        }
    }

    if (file_put_contents($configFile, $data) === false) {
        echo json_encode(['success' => false, 'message' => 'Failed to save configuration']);
        exit;
    }

    echo json_encode(['success' => true, 'server_time' => $serverTimeMs]);
} elseif ($action === 'load') {
    if (!file_exists($configFile)) {
        echo json_encode(['success' => true, 'data' => null]); // New user
        exit;
    }

    $data = file_get_contents($configFile);
    echo json_encode(['success' => true, 'data' => json_decode($data)]);
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
