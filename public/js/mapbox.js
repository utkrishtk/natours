/* eslint-disable */

const locations = JSON.parse(document.getElementById('map').dataset.locations);

mapboxgl.accessToken =
  'pk.eyJ1IjoidXRrcmlzaHQta3VtYXIiLCJhIjoiY2w3bXg4cGg4MXcwbzNvc2E1ZWhjY3Q3cyJ9.otgLCh50Ila-eQcGay3tjw';
const map = new mapboxgl.Map({
  container: 'map', // container ID
  style: 'mapbox://styles/mapbox/streets-v11', // style URL
  center: [-74.5, 40], // starting position [lng, lat]
  zoom: 9, // starting zoom
});
