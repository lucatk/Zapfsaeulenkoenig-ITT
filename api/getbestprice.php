<?php $conf = include('config.php');

$lat = round($_POST["lat"], 7);
$lng = round($_POST["lng"], 7);
$radius = $_POST["radius"];
$type = $_POST["type"];

$db = new mysqli($conf['dbHost'], $conf['dbUsername'], $conf['dbPassword'], $conf['dbDatabase']);
if($db->connect_errno > 0) {
    die('Unable to connect to database [' . $db->connect_error . ']');
}

$stmt = $db->prepare("SELECT * FROM `searches` WHERE `query` = ?");
$query = "$lat;$lng;$radius;$type";
$stmt->bind_param('s', $query);
$stmt->execute();
$stmt->store_result();

$refresh = true;
if($stmt->num_rows > 0) {
  $stmt->bind_result($colQuery, $colLastSearch, $colResult);
  $stmt->fetch();
  if(time() - strtotime($colLastSearch) < 240) {
    $refresh = false;
    $json = json_decode($colResult);
  }
}
$stmt->close();
if($refresh) {

  $jsonEncoded = file_get_contents('https://creativecommons.tankerkoenig.de/json/list.php'
      ."?lat=$lat"     // geographische Breite
      ."&lng=$lng"     //               Länge
      ."&rad=$radius"  // Suchradius in km
      ."&sort=price"   // Sortierung: 'price' oder 'dist'
      ."&type=$type"   // Spritsorte: 'e5', 'e10', oder 'diesel'
      ."&apikey={$conf['apiKey']}");
  $json = json_decode($jsonEncoded);

  $stmt = $db->prepare("INSERT INTO `searches` (`query`, `lastSearch`, `result`) VALUES (?, CURRENT_TIMESTAMP(), ?) ON DUPLICATE KEY UPDATE `lastSearch` = CURRENT_TIMESTAMP(), `result` = VALUES(`result`)");
  $query = "$lat;$lng;$radius;$type";
  $stmt->bind_param('ss', $query, $jsonEncoded);
  $stmt->execute();
  $stmt->close();

  if(array_key_exists('stations', $json) && count($json->stations) > 0) {
    foreach($json->stations as $station) {
      $stmt = $db->prepare("INSERT INTO `tankstellen` (`id`, `name`, `plz`, `ort`, `lat`, `lng`) VALUES(?, ?, ?, ?, ?, ?)");
      $stmt->bind_param('ssisdd', $station->id, $station->name, $station->postCode, $station->place, $station->lat, $station->lng);
      $stmt->execute();
      $stmt->close();

      if($station->isOpen) {
        $stmt = $db->prepare("SELECT * FROM `preise` WHERE `id` = ?");
        $hour = date('H');
        $id = "{$station->id}_{$type}_{$hour}";
        $stmt->bind_param('s', $id);
        $stmt->execute();
        $stmt->store_result();

        if($stmt->num_rows > 0) {
          $stmt->bind_result($colId, $colUpdated, $colAvg, $colAvgCount);
          $stmt->fetch();
          $average = $colAvg;
          $updated = $colUpdated;
          $avgCount = $colAvgCount;
          $stmt->close();

          if(strtotime(date('Y-m-d', time())) > strtotime($updated)) {
            $stmt = $db->prepare("UPDATE `preise` SET `updated` = CURDATE(), `average` = ?, `avgCount` = ? WHERE `id` = ?");
            $hour = date('H');
            $id = "{$station->id}_{$type}_{$hour}";
            $newAvg = ($average * $avgCount + $station->price) / ($avgCount + 1);
            $newAvgCount = $avgCount+1;
            $stmt->bind_param('dis', $newAvg, $newAvgCount, $id);
            $stmt->execute();
            $stmt->close();
          }
        } else {
          $stmt->close();
          $stmt = $db->prepare("INSERT INTO `preise` (`id`, `updated`, `average`, `avgCount`) VALUES(?, CURDATE(), ?, 1)");
          $hour = date('H');
          $id = "{$station->id}_{$type}_{$hour}";
          $stmt->bind_param('sd', $id, $station->price);
          $stmt->execute();
          $stmt->close();
        }
      }
    }
  }
}

if(!array_key_exists('stations', $json) || count($json->stations) < 1) {
  $jsonResult = array(
    "success" => false
  );
} else {
  $bestStation = $json->stations[0];

  $stmt = $db->prepare("SELECT * FROM `preise` WHERE `id` LIKE ?");
  $id = "{$bestStation->id}_{$type}_%";
  $stmt->bind_param('s', $id);
  $stmt->execute();
  $stmt->bind_result($colId, $colUpdated, $colAverage, $colAvgCount);

  $preisHistory = array();
  while ($stmt->fetch()) {
    $preisHistory[intval(substr($colId, -2))] = $colAverage;
  }
  $stmt->close();

  $jsonResult = array(
    "success" => true,
    "bestStation" => $bestStation,
    "history" => $preisHistory
  );
}

$db->close();
echo json_encode($jsonResult);

?>
