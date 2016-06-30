<?php
$json = file_get_contents('https://creativecommons.tankerkoenig.de/json/list.php'
    ."?lat=$lat"     // geographische Breite
    ."&lng=$lng"     //               Länge
    ."&rad=$radius"  // Suchradius in km
    ."&sort=price"   // Sortierung: 'price' oder 'dist'
    ."&type=$type"   // Spritsorte: 'e5', 'e10', oder 'diesel'
    ."&apikey={$conf['apiKey']}");
$data = json_decode($json);

if(!array_key_exists('stations', $data) || count($data->stations) < 1) {
  echo 'b';
} else {
  foreach($data->stations as $station) {
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
?>
