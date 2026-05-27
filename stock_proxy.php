<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

function parse_korean_value($str) {
    if (!$str || $str === '-') return null;
    $str = str_replace([',', ' ', 'USD', 'JPY', 'KRW'], '', $str);
    $total = 0.0;
    // Match numbers with optional decimal point followed by 조, 억, 만
    if (preg_match_all('/([\d.]+)(조|억|만)/u', $str, $matches, PREG_SET_ORDER)) {
        foreach ($matches as $match) {
            $num = (float)$match[1];
            $unit = $match[2];
            if ($unit === '조') {
                $total += $num * 1000000000000;
            } else if ($unit === '억') {
                $total += $num * 100000000;
            } else if ($unit === '만') {
                $total += $num * 10000;
            }
            $str = str_replace($match[0], '', $str);
        }
    }
    if (preg_match('/([\d.]+)/', $str, $m)) {
        $total += (float)$m[1];
    }
    return $total > 0 ? $total : null;
}

function get_domestic_stock_data($codes) {
    $stocks = [];
    $codes_str = implode(',', $codes);
    $options = [ "http" => [ "header" => "User-Agent: Mozilla/5.0\r\n" ] ];
    $context = stream_context_create($options);

    $polling_url = "https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:" . $codes_str;
    $polling_json = @file_get_contents($polling_url, false, $context);

    if ($polling_json) {
        $polling_json_utf8 = iconv("EUC-KR", "UTF-8", $polling_json);
        $polling_data = json_decode($polling_json_utf8, true);

        if ($polling_data && $polling_data['resultCode'] === 'success' && !empty($polling_data['result']['areas'][0]['datas'])) {
            foreach ($polling_data['result']['areas'][0]['datas'] as $item) {
                $code = $item['cd'];
                $current_price = (float)$item['nv'];
                $prev_close = (float)$item['pcv'];
                $change = $current_price - $prev_close;

                $stocks[$code] = [
                    'code' => $code,
                    'name' => $item['nm'],
                    'currentPrice' => $current_price,
                    'changePrice' => $change,
                    'changeRate' => ($prev_close > 0) ? ($change / $prev_close) * 100 : 0,
                    'previousClose' => $prev_close,
                    'openPrice' => (float)$item['ov'],
                    'highPrice' => (float)$item['hv'],
                    'lowPrice' => (float)$item['lv'],
                    'volume' => (float)$item['aq'],
                    'tradingValue' => isset($item['aa']) ? (float)$item['aa'] : 0,
                    'marketStatus' => $item['ms'],
                    'isInternational' => false
                ];
            }
        }
    }
    return $stocks;
}

function get_international_stock_data($code) {
    $options = [ "http" => [ "header" => "User-Agent: Mozilla/5.0\r\n" ] ];
    $context = stream_context_create($options);
    $url = "https://api.stock.naver.com/stock/" . $code . "/basic";
    $json = @file_get_contents($url, false, $context);
    
    if (!$json) return null;
    $data = json_decode($json, true);
    if (!$data || isset($data['code'])) return null;

    $current_price = (float)str_replace(',', '', $data['closePrice']);
    $prev_close = (float)str_replace(',', '', $data['compareToPreviousClosePrice']) + $current_price; // Approximation if not direct
    
    // Better way to get prevClose
    foreach($data['stockItemTotalInfos'] as $info) {
        if ($info['code'] === 'basePrice') $prev_close = (float)str_replace(',', '', $info['value']);
    }

    $change = $current_price - $prev_close;

    return [
        'code' => $code,
        'name' => $data['stockName'],
        'currentPrice' => $current_price,
        'changePrice' => $change,
        'changeRate' => (float)$data['fluctuationsRatio'],
        'previousClose' => $prev_close,
        'openPrice' => null, // Available in totalInfos if needed
        'highPrice' => null,
        'lowPrice' => null,
        'volume' => null,
        'tradingValue' => null,
        'marketStatus' => $data['marketStatus'],
        'isInternational' => true,
        'fiftyTwoWeekHigh' => null,
        'fiftyTwoWeekLow' => null
    ];
}

function get_extra_info(&$stock) {
    $code = $stock['code'];
    $options = [ "http" => [ "header" => "User-Agent: Mozilla/5.0\r\n" ] ];
    $context = stream_context_create($options);

    if ($stock['isInternational']) {
        $url = "https://api.stock.naver.com/stock/" . $code . "/basic";
        $json = @file_get_contents($url, false, $context);
        if ($json) {
            $data = json_decode($json, true);
            foreach ($data['stockItemTotalInfos'] as $info) {
                if ($info['code'] === 'highPriceOf52Weeks') $stock['fiftyTwoWeekHigh'] = (float)str_replace(',', '', $info['value']);
                if ($info['code'] === 'lowPriceOf52Weeks') $stock['fiftyTwoWeekLow'] = (float)str_replace(',', '', $info['value']);
                if ($info['code'] === 'openPrice') $stock['openPrice'] = (float)str_replace(',', '', $info['value']);
                if ($info['code'] === 'highPrice') $stock['highPrice'] = (float)str_replace(',', '', $info['value']);
                if ($info['code'] === 'lowPrice') $stock['lowPrice'] = (float)str_replace(',', '', $info['value']);
                if ($info['code'] === 'accumulatedTradingVolume') $stock['volume'] = (float)str_replace(',', '', $info['value']);
                if ($info['code'] === 'accumulatedTradingValue') {
                    $stock['tradingValue'] = parse_korean_value($info['value']);
                }
            }
        }
    } else {
        $url = "https://finance.naver.com/item/main.naver?code=" . $code;
        $html = @file_get_contents($url, false, $context);
        if ($html) {
            $html_utf8 = iconv("EUC-KR", "UTF-8", $html);
            if (preg_match('/52주 최고<\/span>\s*<em class="(?:up|same)">\s*([\d,]+)/', $html_utf8, $matches)) {
                $stock['fiftyTwoWeekHigh'] = (int)str_replace(',', '', $matches[1]);
            }
            if (preg_match('/52주 최저<\/span>\s*<em class="(?:down|same)">\s*([\d,]+)/', $html_utf8, $matches)) {
                $stock['fiftyTwoWeekLow'] = (int)str_replace(',', '', $matches[1]);
            }
        }
    }
}

function get_candle_data($code) {
    $isInternational = strpos($code, '.') !== false;
    $options = [ "http" => [ "header" => "User-Agent: Mozilla/5.0\r\n" ] ];
    $context = stream_context_create($options);
    
    if ($isInternational) {
        $today = date('Ymd');
        $url = "https://api.finance.naver.com/siseJson.naver?symbol=" . $code . "&requestType=1&startTime=20240101&endTime=" . $today . "&timeframe=day";
    } else {
        $url = "https://fchart.stock.naver.com/sise.nhn?symbol=" . $code . "&timeframe=day&count=40&requestType=0";
    }

    $response = @file_get_contents($url, false, $context);
    if ($response === FALSE) return [];

    $candles = [];
    if ($isInternational) {
        $response_utf8 = iconv("EUC-KR", "UTF-8", $response);
        $data = json_decode(trim($response_utf8), true);
        if (is_array($data)) {
            array_shift($data); // header
            $data = array_slice($data, -40); // last 40
            foreach ($data as $item) {
                $candles[] = [
                    "time" => $item[0],
                    "open" => (float)$item[1],
                    "high" => (float)$item[2],
                    "low" => (float)$item[3],
                    "close" => (float)$item[4],
                    "volume" => (float)$item[5]
                ];
            }
        }
    } else {
        $response_utf8 = iconv("EUC-KR", "UTF-8", $response);
        if (preg_match_all('/<item data="([^"]+)"\s*\/>/', $response_utf8, $matches)) {
            foreach ($matches[1] as $itemStr) {
                $parts = explode('|', $itemStr);
                if (count($parts) >= 5) {
                    $candles[] = [
                        "time" => $parts[0],
                        "open" => (float)$parts[1],
                        "high" => (float)$parts[2],
                        "low" => (float)$parts[3],
                        "close" => (float)$parts[4],
                        "volume" => isset($parts[5]) ? (float)$parts[5] : 0
                    ];
                }
            }
        }
    }
    return $candles;
}

function get_search_results($keyword) {
    $options = [ "http" => ["header" => "User-Agent: Mozilla/5.0\r\n"] ];
    $context = stream_context_create($options);
    $url = "https://ac.stock.naver.com/ac?q=" . urlencode($keyword) . "&st=111&target=stock&r_format=json";
    $response = @file_get_contents($url, false, $context);

    if ($response === FALSE) return [];
    $data = json_decode($response, true);
    $results = [];
    if ($data && isset($data['items'])) {
        foreach ($data['items'] as $item) {
            $results[] = [
                "name" => $item['name'],
                "code" => $item['reutersCode'],
                "nation" => $item['nationName']
            ];
        }
    }
    return $results;
}

$type = isset($_GET['type']) ? $_GET['type'] : 'quote';
$codes_str = isset($_GET['codes']) ? $_GET['codes'] : '005930';
$codes = explode(',', $codes_str);

if ($type === 'candle') {
    $candles = get_candle_data($codes[0]);
    echo json_encode(["success" => true, "candles" => $candles]);
} else if ($type === 'search') {
    $keyword = isset($_GET['keyword']) ? $_GET['keyword'] : '';
    $results = get_search_results($keyword);
    echo json_encode(["success" => true, "results" => $results]);
} else {
    $domestic_codes = [];
    $international_codes = [];
    foreach ($codes as $c) {
        if (strpos($c, '.') !== false) $international_codes[] = $c;
        else $domestic_codes[] = $c;
    }

    $results = [];
    if (!empty($domestic_codes)) {
        $domestic_results = get_domestic_stock_data($domestic_codes);
        foreach ($domestic_results as $code => $data) {
            get_extra_info($data);
            $results[] = $data;
        }
    }
    foreach ($international_codes as $code) {
        $data = get_international_stock_data($code);
        if ($data) {
            get_extra_info($data);
            $results[] = $data;
        }
    }

    echo json_encode(["success" => true, "stocks" => $results]);
}
?>
