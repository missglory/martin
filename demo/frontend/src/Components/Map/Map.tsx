import React, { PureComponent } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { MAP_STYLE } from "../../config/constants";
import layers from "../../config/layers";
import dateConverter from "../../utils/dateConverter";

import Container from "./Container";
import Filters from "./Filters";
import * as DECK from "deck.gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
// import { MVTLayer, MVTLayerPickingInfo } from "@deck.gl/geo-layers";
import type { Feature, Geometry } from "geojson";

const COORDS_MSC = [37.612722, 55.752778];

const AIR_PORTS =
  "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_10m_airports.geojson";

const mapStyle = { height: "1615px", marginLeft: "350px" };

class Map extends PureComponent<
  {},
  { visibleLayer: any; range: any; hour: any }
> {
  map: any;
  nav: any;

  constructor(props: {} | Readonly<{}>) {
    super(props);
    this.state = {
      visibleLayer: "trips",
      range: {
        from: new Date(2017, 0, 1),
        to: new Date(2017, 4, 4),
      },
      hour: 9,
    };
  }

  componentDidMount() {
    this.map = new maplibregl.Map({
      cooperativeGestures: true,
      container: "map",
      style: MAP_STYLE,
      center: [-74.005308, 40.71337],
      pitch: 45,
      zoom: 9,
    });
    this.nav = new maplibregl.NavigationControl();

    this.map.addControl(this.nav, "top-right");
    this.map.on("load", this.mapOnLoad);
  }

  componentDidUpdate() {
    const newStyle = this.map.getStyle();
    newStyle.sources[
      "trips_source"
    ].url = `/tiles/get_trips?${this.getQueryParams()}`;
    this.map.setStyle(newStyle);
  }

  mapOnLoad = () => {
    const queryParams = this.getQueryParams();

    this.map.addSource("trips_source", {
      type: "vector",
      url: `/tiles/get_trips?${queryParams}`,
    });
    layers.forEach(({ maplibreLayer }) => {
      this.map.addLayer(maplibreLayer, "place_town");
    });

    const limit = 100;
    // Sample data source = https://data.iledefrance.fr
    const parisSights = `https://data.iledefrance.fr/api/explore/v2.1/catalog/datasets/principaux-sites-touristiques-en-ile-de-france0/records?limit=${limit}`;

    let layerControl;

    type PropertiesType = {
      name?: string;
      rank: number;
      layerName: string;
      class: string;
    };

    // const mvtLayer = new MVTLayer<PropertiesType>({
    //   id: "MVTLayer",
    //   // data: [`http://${import.meta.ev.MBTILES_URL}/{z}/{x}/{y}`],
    //   data: [
    //     `https://geo.mgswag.duckdns.org/tiles/central-fed-district-shortbread/{z}/{x}/{y}`,
    //   ],
    //   minZoom: 0,
    //   maxZoom: 14,
    //   getFillColor: (f: Feature<Geometry, PropertiesType>) => {
    //     switch (f.properties.layerName) {
    //       case "poi":
    //         return [255, 0, 0];
    //       case "water":
    //         return [120, 150, 180];
    //       case "building":
    //         return [218, 218, 218];
    //       default:
    //         return [240, 240, 240];
    //     }
    //   },
    //   getLineWidth: (f: Feature<Geometry, PropertiesType>) => {
    //     switch (f.properties.class) {
    //       case "street":
    //         return 6;
    //       case "motorway":
    //         return 10;
    //       default:
    //         return 1;
    //     }
    //   },
    //   getLineColor: [192, 192, 192],
    //   getPointRadius: 2,
    //   pointRadiusUnits: "pixels",
    //   stroked: false,
    //   // picking: true,
    // });

    const deckOverlay = new MapboxOverlay({
      // interleaved: true,
      layers: [
        new DECK.GeoJsonLayer({
          id: "airports",
          data: AIR_PORTS,
          // Styles
          filled: true,
          pointRadiusMinPixels: 2,
          pointRadiusScale: 2000,
          getPointRadius: (f) => 11 - f.properties.scalerank,
          getFillColor: [200, 0, 80, 180],
          // Interactive props
          pickable: true,
          autoHighlight: true,
          onClick: (info) =>
            // eslint-disable-next-line
            info.object &&
            alert(
              `${info.object.properties.name} (${info.object.properties.abbrev})`
            ),
          // beforeId: 'watername_ocean' // In interleaved mode, render the layer under map labels
        }),
        new DECK.ArcLayer({
          id: "arcs",
          data: AIR_PORTS,
          dataTransform: (d) =>
            //@ts-ignore
            d.features.filter((f) => f.properties.scalerank < 4),
          // Styles
          getSourcePosition: (f) => [-0.4531566, 51.4709959], // London
          getTargetPosition: (f) => f.geometry.coordinates,
          getSourceColor: [0, 128, 200],
          getTargetColor: [200, 0, 80],
          getWidth: 1,
        }),
        // mvtLayer,
      ],
    });

    this.map.addControl(deckOverlay);
  };

  changeFilter = (filter: string, value: any) => {
    if (filter !== undefined && value !== undefined) {
      this.setState((state) => ({
        ...state,
        [filter]: value,
      }));
    }
  };

  getQueryParams = () => {
    const {
      range: { from, to },
      hour,
    } = this.state;

    const dateFrom = `${dateConverter(from)}.2017`;
    let dateTo = `${dateConverter(to)}.2017`;
    if (to === undefined) {
      dateTo = dateFrom;
    }

    return encodeURI(`date_from=${dateFrom}&date_to=${dateTo}&hour=${hour}`);
  };

  toggleLayer = (layerId: string) => {
    layers.forEach(({ id }) => {
      if (layerId === id) {
        this.map.setLayoutProperty(id, "visibility", "visible");
      } else {
        this.map.setLayoutProperty(id, "visibility", "none");
      }
    });
    this.setState({ visibleLayer: layerId });
  };

  render() {
    const { visibleLayer, range, hour } = this.state;

    return (
      <Container>
        <Filters
          visibleLayer={visibleLayer}
          range={range}
          hour={hour}
          toggleLayer={this.toggleLayer}
          changeFilter={this.changeFilter}
        />
        <div id="map" style={mapStyle} />
      </Container>
    );
  }
}

export default Map;
