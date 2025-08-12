## Description
This is the guide to Extract Transform and Load information from /data raw xlsx to a usable csv for DuckDB.

## DATA
Input Directory: /data_raw
Output Directory: /data_cleaned

## PARSE FILENAME TO CSV
Date=First 8 characters
Genre is from the characters between the date and "_raw_data.xlsx"
Genre Key:
_cozy_mystery="Cozy Mystery"
_erotica="Erotica"
_fantasy="Fantasy"
_gay_romance="Gay Romance"
_historical_romance="Historical Romance"
_m_t_s="Mystery, Thriller & Suspense"
_paranormal="Paranormal Romance"
_romance_1hr="Romance Short Reads (1hr)"
_romance="Romance"
_science_fiction 
_science_fiction_romance 
_sff="Science Fiction & Fantasy"
_teen _and_ya="Teen & Young Adult"
_urban_fantasy="Urban Fantasy"

## Excel Columns
Extract if TRUE
- Title: TRUE
- ASIN: TRUE
- kuStatus: 
- Author: TRUE
- Series: TRUE
- nReviews: TRUE
- reviewAverage: TRUE
- price: TRUE
- salesRank: TRUE
- releaseDate: TRUE
- nPages: 
- publisher: TRUE
- isTrad: 
- blurbText: TRUE
- coverImage: TRUE
- bookURL: TRUE
- topicTags: TRUE (Tags are separated by "|")
- blurbKeyphrases: TRUE
- subcatsList: TRUE (Separate each Subcategory)
- isFree:
- isDuplicateASIN:
- estimatedBlurbPOV: TRUE
- hasSupernatural: TRUE
- hasRomance: TRUE