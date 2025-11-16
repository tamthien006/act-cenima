package vchung.ph59842.app_datve.models;

import com.google.gson.annotations.SerializedName;

public class Showtime {
    @SerializedName("_id")
    private String _id;
    
    @SerializedName("id")
    private String id;
    
    @SerializedName("movie")
    private String movie;
    
    @SerializedName("movieId")
    private String movieId;
    
    @SerializedName("theaterId")
    private String theaterId;
    
    @SerializedName("roomId")
    private String roomId;
    
    @SerializedName("theater")
    private Theater theater;
    
    @SerializedName("cinemaId")
    private String cinemaId;
    
    @SerializedName("cinemaName")
    private String cinemaName;
    
    @SerializedName("room")
    private Room room;
    
    // Make theater and room accessible for logging
    public Theater getTheater() {
        return theater;
    }
    
    public Room getRoom() {
        return room;
    }
    
    @SerializedName("roomName")
    private String roomName;
    
    @SerializedName("startTime")
    private String startTime;
    
    @SerializedName("endTime")
    private String endTime;
    
    @SerializedName("date")
    private String date;
    
    @SerializedName("price")
    private double price;
    
    @SerializedName("availableSeats")
    private Object availableSeats; // Can be array or number
    
    @SerializedName("totalSeats")
    private int totalSeats;
    
    @SerializedName("address")
    private String address;
    
    @SerializedName(value = "isActive", alternate = { "isactive" })
    private Boolean isActive;
    
    @SerializedName("isAvailable")
    private boolean isAvailable;

    public Showtime() {}

    public String get_id() {
        return _id;
    }

    public void set_id(String _id) {
        this._id = _id;
    }

    public String getId() {
        return id != null ? id : _id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getMovieId() {
        if (movieId != null && !movieId.isEmpty()) return movieId;
        if (movie != null && !movie.isEmpty()) return movie;
        return null;
    }

    public void setMovieId(String movieId) {
        this.movieId = movieId;
    }

    public String getCinemaId() {
        if (cinemaId != null && !cinemaId.isEmpty()) return cinemaId;
        if (theaterId != null && !theaterId.isEmpty()) return theaterId;
        if (theater != null && theater.get_id() != null) return theater.get_id();
        return null;
    }

    public void setCinemaId(String cinemaId) {
        this.cinemaId = cinemaId;
    }

    public String getCinemaName() {
        if (cinemaName != null && !cinemaName.isEmpty()) return cinemaName;
        if (theater != null && theater.getName() != null) return theater.getName();
        return null;
    }

    public void setCinemaName(String cinemaName) {
        this.cinemaName = cinemaName;
    }

    public String getRoomId() {
        if (roomId != null && !roomId.isEmpty()) return roomId;
        if (room != null && room.get_id() != null) return room.get_id();
        return null;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getRoomName() {
        if (roomName != null && !roomName.isEmpty()) return roomName;
        if (room != null && room.getName() != null) return room.getName();
        return null;
    }

    public void setRoomName(String roomName) {
        this.roomName = roomName;
    }
    
    // Inner classes for nested objects
    public static class Theater {
        @SerializedName("_id")
        private String _id;
        
        @SerializedName("name")
        private String name;
        
        @SerializedName("address")
        private String address;
        
        @SerializedName("city")
        private String city;
        
        public String get_id() {
            return _id;
        }
        
        public void set_id(String _id) {
            this._id = _id;
        }
        
        public String getName() {
            return name;
        }
        
        public void setName(String name) {
            this.name = name;
        }
        
        public String getAddress() {
            return address;
        }
        
        public void setAddress(String address) {
            this.address = address;
        }
        
        public String getCity() {
            return city;
        }
        
        public void setCity(String city) {
            this.city = city;
        }
    }
    
    public static class Room {
        @SerializedName("_id")
        private String _id;
        
        @SerializedName("name")
        private String name;
        
        @SerializedName("capacity")
        private int capacity;
        
        public String get_id() {
            return _id;
        }
        
        public void set_id(String _id) {
            this._id = _id;
        }
        
        public String getName() {
            return name;
        }
        
        public void setName(String name) {
            this.name = name;
        }
        
        public int getCapacity() {
            return capacity;
        }
        
        public void setCapacity(int capacity) {
            this.capacity = capacity;
        }
    }

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public int getAvailableSeats() {
        if (availableSeats == null) {
            return 0;
        }
        if (availableSeats instanceof java.util.List) {
            return ((java.util.List<?>) availableSeats).size();
        }
        if (availableSeats instanceof Number) {
            return ((Number) availableSeats).intValue();
        }
        return 0;
    }

    public void setAvailableSeats(Object availableSeats) {
        this.availableSeats = availableSeats;
    }

    public int getTotalSeats() {
        return totalSeats;
    }

    public void setTotalSeats(int totalSeats) {
        this.totalSeats = totalSeats;
    }
    
    public String getAddress() {
        if (address != null && !address.isEmpty()) return address;
        if (theater != null && theater.getAddress() != null && !theater.getAddress().isEmpty()) {
            return theater.getAddress();
        }
        return null;
    }
    
    public void setAddress(String address) {
        this.address = address;
    }
    
    // Returns true if the showtime is active (or not specified as inactive)
    // and the start time is in the future. This prevents false "Hết vé" when
    // the backend doesn't provide seat availability yet.
    public boolean isBookableNow() {
        if (isActive != null && !isActive) return false;
        long start = parseStartTimeToMillis();
        if (start <= 0) {
            // If cannot parse start time, fallback to isActive flag
            return isActive == null || isActive;
        }
        return start > System.currentTimeMillis();
    }
    
    private long parseStartTimeToMillis() {
        if (startTime == null || startTime.isEmpty()) return -1;
        // Try multiple ISO patterns commonly returned by Node.js/Mongo
        String[] patterns = new String[] {
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "yyyy-MM-dd'T'HH:mm:ss.SSS",
            "yyyy-MM-dd'T'HH:mm:ss"
        };
        for (String p : patterns) {
            try {
                java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat(p, java.util.Locale.getDefault());
                // Assume backend time in UTC when 'Z' present
                if (p.endsWith("'Z'")) {
                    sdf.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
                }
                return sdf.parse(startTime).getTime();
            } catch (Exception ignored) {}
        }
        return -1;
    }

    public boolean isAvailable() {
        // If isActive is explicitly false -> not available
        if (isActive != null && !isActive) return false;
        // If backend provides isAvailable true -> available
        if (isAvailable) return true;
        // Fallback: if seats count > 0 -> available
        return getAvailableSeats() > 0;
    }

    public void setAvailable(boolean available) {
        isAvailable = available;
    }
    
    public boolean isActive() {
        // Default to true when null to avoid false negatives from missing field
        return isActive == null ? true : isActive;
    }
    
    public void setActive(boolean active) {
        isActive = active;
    }
    
    // Helper method to format time (e.g., "2024-01-10T09:00:00" -> "09:00")
    public String getFormattedTime() {
        if (startTime == null || startTime.isEmpty()) {
            return "";
        }
        try {
            // If time contains T, extract time part
            if (startTime.contains("T")) {
                String timePart = startTime.substring(startTime.indexOf("T") + 1);
                // Extract HH:mm
                if (timePart.length() >= 5) {
                    return timePart.substring(0, 5);
                }
            }
            return startTime;
        } catch (Exception e) {
            return startTime;
        }
    }
    
    // Helper method to format price
    public String getFormattedPrice() {
        return String.format("%.0f", price) + "₫";
    }
}


