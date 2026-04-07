# Urbanev: An open benchmark dataset for urban electric vehicle charging demand prediction

## Data description

The UrbanEV dataset was developed to meet the urgent need for understanding and forecasting electric vehicle (EV) charging demand in urban environments. As global EV adoption accelerates, efficient charging infrastructure management is crucial for ensuring grid stability and enhancing user experience. Collected from public EV charging stations in Shenzhen, China — a leading city in vehicle electrification — the dataset covers a six-month period (September 1, 2022, to February 28, 2023), capturing seasonal variations in charging patterns. To ensure data quality, the raw records underwent meticulous preprocessing, including the extraction of key information (availability status, rated power, and fees), anomaly removal, and missing value imputation via forward and backward filling. Outliers identified by the IQR method were replaced with adjacent valid values. The data was aggregated both temporally (hourly) and spatially (by traffic zones), with variance tests and zero-value filtering applied to exclude low-activity regions. The final dataset includes charging data (occupancy, duration, and volume), weather conditions, spatial features (adjacency matrices and distances), and static attributes (Points of Interest, area size, and road length).

To evaluate the dataset’s utility in EV charging demand prediction, a benchmarking study was conducted using three traditional forecasting methods, five deep learning models, and two Transformer-based predictors. Model performance was assessed via RMSE, MAPE, RAE, and MAE across three tasks: distribution prediction, node prediction, and factorial experiments. The first task examined spatial dependencies and global demand patterns, while the second focused on localized temporal characteristics. The factorial experiments assessed the influence of auxiliary factors (electricity prices, service fees, temperature, pressure, and humidity) on charging occupancy.

## Files and Variables

### File: UrbanEVDataset.zip

**Description:** The UrbanEVDataset archive contains raw electric vehicle (EV) charging data at individual charging stations (recorded at 5-minute intervals) as well as processed EV charging data aggregated at the administrative zone level (provided in both 5-minute and hourly intervals). Additionally, it includes static spatial data for charging stations and administrative zones, along with corresponding meteorological datasets. This comprehensive dataset enables researchers to replicate experimental outcomes and perform extensive analyses on EV charging behaviors.

**Folder - 20220901-20230228_station-raw**: Contains raw EV charging data collected over a six-month period (from September 1, 2022, to February 28, 2023) at the charging station level. Some stations exhibit missing data points, which can be resolved using appropriate imputation techniques.

* **Subfolder - charge_5min**: Includes 1,682 CSV files (from 1001.csv to 2682.csv), each corresponding to data from a specific charging station. Each file contains identical fields:
  * time: Timestamp, ranging from 2022-09-01 00:00 to 2023-02-28 23:00, format: YYYY-MM-DD HH:MM (Unit: None).
  * busy: Number of occupied charging piles (Unit: None).
  * idle: Number of available (idle) charging piles (Unit: None).
  * s_price: Service fee per kilowatt-hour of electricity (Unit: CNY/kWh).
  * e_price: Electricity price per kilowatt-hour (Unit: CNY/kWh).
  * fast_busy: Number of occupied fast charging piles (Unit: None).
  * fast_idle: Number of available fast charging piles (Unit: None).
  * slow_busy: Number of occupied slow charging piles (Unit: None).
  * slow_idle: Number of available slow charging piles (Unit: None).
  * duration: Total charging duration aggregated across all charging piles (Unit: hours).
  * volume: Total energy dispensed, computed by multiplying charging duration with respective charging pile power ratings (Unit: kWh).
* **File - pile_rated_power.csv**: Contains information on 22,650 individual charging piles. Fields include:
  * pileNo: Unique identifier for each charging pile. (Unit: None)
  * power: Rated power of the charging pile (Unit: kW).
  * pileType: Type of charging pile, categorized as Direct Current (DC) or Alternating Current (AC).  (Unit: None)
  * station_id: Unique identifier of the charging station.  (Unit: None)
* **File - station_distance.csv**: Distance matrix among the 1,682 charging stations (Unit: meters).
* **File - station_information.csv**: Static information for 1,682 charging stations. Fields include:
  * station_id: Unique identifier for each charging station.  (Unit: None)
  * longitude: Longitude coordinate of the charging station in WGS-84 coordinate system.  (Unit: None)
  * latitude: Latitude coordinate of the charging station in WGS-84 coordinate system. (Unit: None)
  * slow_count: Count of slow charging piles at the station. (Unit: None)
  * fast_count: Count of fast charging piles at the station. (Unit: None)
  * charge_count: Total number of charging piles at the station. (Unit: None)
  * TAZID: Identifier of the administrative zone where the station is located. (Unit: None)

**Folder - 20220901-20230228_zone-cleaned-aggregated**: Provides cleaned and aggregated EV charging data at the administrative zone level. Erroneous data have been corrected, and missing values have been imputed. Data are available at both 5-minute and hourly intervals and include adjacency matrices, distance matrices, and static spatial attributes.

* **Subfolder - charge_5min|charge_1hour**: Each subfolder contains datasets for 275 administrative zones with corresponding temporal resolutions. All data files within this directory have an identical structure: the first column (time) records timestamps ranging from 2022-09-01 00:00 to 2023-02-28 23:00 (format: YYYY-MM-DD HH:MM, Unit: None). Columns 2 to 276 contain charging-related data for each zone. The first row of these columns indicates the zone ID (TAZID), and subsequent rows provide charging information specific to each dataset (e.g., occupancy rate for occupancy.csv, charging duration for duration.csv). Files include:
  * duration.csv: Aggregated EV charging duration per time interval (Unit: hours).
  * e_price.csv: Electricity prices (Unit: CNY/kWh).
  * occupancy.csv: Occupancy rate of charging stations per time interval (Unit: %).
  * s_price.csv: Service fees per kilowatt-hour (Unit: CNY/kWh).
  * volume.csv: Aggregated EV charging volume per time interval (Unit: kWh).
  * volume-11kW.csv: Supplementary charging volume data calculated using a standardized 11 kW rating for Tesla Model Y vehicles.  (Unit: kWh).
* **File - adj.csv**: Adjacency matrix of 275 administrative zones.
* **File - distance.csv**: Distance matrix among 275 administrative zones (Unit: meters).
* **File - zone-information.csv**: Spatial and charging pile information at the administrative zone level. Fields include:
  * TAZID: Unique identifier for administrative zones. (Unit: None)
  * longitude: Longitude coordinate of the zone centroid in WGS-84 coordinate system. (Unit: None)
  * latitude: Latitude coordinate of the zone centroid in WGS-84 coordinate system. (Unit: None)
  * charge_count: Total number of charging piles within the zone. (Unit: None)
  * area: Area of the administrative zone (Unit: square meters).
  * perimeter: Perimeter of the administrative zone (Unit: meters).

## Code/software

**Description:** This archive contains code for distribution time-series prediction using both traditional and deep learning models based on the UrbanEV dataset. It includes modularized functions that assist researchers in efficiently reproducing data verification and analysis conclusions by providing comprehensive code support.

### Software Requirements

To view and analyze the data, open-source software such as Microsoft Excel can be used for visualizing CSV files. Additionally, all data processing, analysis, and experimental validation are performed using Python and its related open-source libraries. The required dependencies and setup instructions are detailed below.

### Environment Setup and Workflow

1. **Environment Setup:** Run the `init_env.bat` or `init_env.sh` script to create a virtual environment and install the required dependencies.
2. **Data Placement:** After setting up the environment, download and unzip the `UrbanEVDataset.zip` file. Place the folder `20220901-20230228_zone-cleaned-aggregated/charge_1hour` containing the relevant charging data CSV files into the `data` folder. Additionally, include the following files from `20220901-20230228_zone-cleaned-aggregated` in the `data` folder:
   * `adj.csv` (Adjacency matrix for regions)
   * `distance.csv` (Distance matrix for regions)
   * `zone-information.csv` (Static information for regions; **rename this file to `inf.csv`** to avoid potential errors)
3. **Experiment Execution:** Run the `exp.bat` or `exp.sh` script to start time-series prediction experiments.
4. **Output Management:** Model checkpoints are saved in the `checkpoints` folder, and experiment results are stored in the `results` folder within the code directory.

### Source Files

* **code**: Contains code for distribution time-series prediction utilizing traditional and deep learning models based on the UrbanEV dataset. Key files include:
  * `baselines.py`: Implements three traditional forecasting methods (Last Observation, Auto-regressive (AR), and ARIMA) along with six deep learning models (Fully Connected Neural Network (FCNN), Long Short-Term Memory (LSTM), Graph Convolutional Network (GCN), GCN-LSTM, and Attention-Based Spatial-Temporal Graph Convolutional Network (ASTGCN)).
  * `exp.bat` | `exp.sh`: Scripts for initiating distribution time-series prediction tasks.
  * `init_env.bat` | `init_env.sh`: Scripts to set up a virtual environment for running time-series predictions using the UrbanEV dataset.
  * `main.py`: The main execution script.
  * `parse.py`: Provides a command-line interface for configuring training parameters for spatiotemporal EV charging demand prediction models.
  * `preprocess.py`: Converts data in the `./data/dataset` folder into a format suitable for Transformer-based time-series models.
  * `train.py`: Model training script.
  * `utils.py`: Utility functions designed for UrbanEV dataset prediction tasks, including time-series cross-validation and dataset preparation.
* **code_transformer**: Contains code for time-series prediction using Transformer-based models on the UrbanEV dataset. Key folders and files include:
  * `data_provider`: Includes `data_factory.py` and `data_loader.py`, which prepare UrbanEV data in a format compatible with models like TimeXer.
  * `exp`: Contains `exp_basic.py` and `exp_long_term_forecasting.py`, which define the time-series prediction tasks for Transformer models such as TimeXer.
  * `layers`: Includes `Conv_Blocks.py`, `Embed.py`, and `SelfAttention_Family.py`, which define core layers used in TimeXer and TimesNet models.
  * `models`: Includes `TimesNet.py` and `TimesXer.py`, which implement the complete structure and functionality of TimesNet and TimeXer models.
  * `utils`: Contains `masking.py`, `metrics.py`, `print_args`, `timefeatures.py`, and `tools.py`, providing utility modules essential for the training and testing processes.
  * `exp.bat` | `exp.sh`: Scripts for initiating Transformer-based model predictions.
  * `run.py`: The main program for Transformer-based time-series predictions.

## Supplemental information

**Description**: This supplemental dataset provides geographic boundaries, weather data, and points-of-interest (POI) for Shenzhen city, facilitating analysis of urban electric vehicle (EV) charging behavior in relation to infrastructure, climate, and local businesses.

### File: UrbanEVSupplemental.zip

* **Folder - shenzhen_districts**: Contains geographic data representing administrative districts of Shenzhen in ArcGIS format, using the WGS 1984 Albers coordinate system. Files include:
  * shenzhen.shp: Primary shapefile containing geometric boundary information of administrative districts in Shenzhen.
  * shenzhen.shx: Shapefile index, facilitating spatial indexing and rapid data retrieval.
  * shenzhen.dbf: Database file providing attribute information for each administrative district, including district names, areas, and perimeters.
* **File - 20220901-20230228_weather_central.csv**: Weather data sourced from the Futian Central Meteorological Station (central Shenzhen), normalized via Min-Max scaling to facilitate correlation analyses with EV charging patterns. Fields include:
  * T: Air temperature (Unit: °C).
  * P0: Atmospheric pressure at station altitude (Unit: mmHg).
  * P: Sea-level atmospheric pressure (Unit: mmHg).
  * U: Relative humidity (Unit: %).
  * RAIN: Rain classification (0-no rain, 1-light rain, 2-moderate rain, 3-heavy rain). (Unit: None)
  * Td: Dewpoint temperature (Unit: °C).
* **File - 20220901-20230228_weather_airport.csv**: Supplementary weather data from Bao'an Airport Meteorological Station (Shenzhen), with fields identical to the central meteorological station data. Fields include:
  * T: Air temperature (Unit: °C).
  * P0: Atmospheric pressure at station altitude (Unit: mmHg).
  * P: Sea-level atmospheric pressure (Unit: mmHg).
  * U: Relative humidity (Unit: %).
  * RAIN: Rain classification (0-no rain, 1-light rain, 2-moderate rain, 3-heavy rain). (Unit: None)
  * Td: Dewpoint temperature (Unit: °C).
* **File - 20221201-shenzhen-poi.csv**: Points of Interest (POI) data for Shenzhen, collected as of December 1, 2022. Fields include:
  * longitude: Longitude coordinate of the point of interest in WGS-84 coordinate system. (Unit: None)
  * latitude: Latitude coordinate of the point of interest in WGS-84 coordinate system. (Unit: None)
  * primary_types: Category of POI, specifically including "Food and beverage" establishments. (Unit: None)

## Access Information

### Other publicly accessible locations of the data

* [GitHub Repository](https://github.com/IntelligentSystemsLab/UrbanEV)
* [Google Drive](https://drive.google.com/drive/folders/1VUgdb8uNgmtvO93BHBK_OrSxjndrF-48)

