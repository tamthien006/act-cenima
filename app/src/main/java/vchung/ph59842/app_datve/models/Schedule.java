package vchung.ph59842.app_datve.models;

import com.google.gson.annotations.SerializedName;

public class Schedule {
    @SerializedName("_id")
    private String _id;
    
    @SerializedName("id")
    private String id;
    
    @SerializedName("movieId")
    private String movieId;
    
    @SerializedName("cinemaId")
    private String cinemaId;
    
    @SerializedName("roomId")
    private String roomId;
    
    @SerializedName("startTime")
    private String startTime;
    
    @SerializedName("endTime")
    private String endTime;
    
    @SerializedName("priceTable")
    private PriceTable priceTable;
    
    @SerializedName("status")
    private String status; // scheduled | cancelled | completed
    
    @SerializedName("isFull")
    private boolean isFull;
    
    @SerializedName("is3d")
    private boolean is3d;
    
    @SerializedName("hasSubtitles")
    private boolean hasSubtitles;
    
    @SerializedName("isDubbed")
    private boolean isDubbed;
    
    @SerializedName("notes")
    private String notes;
    
    @SerializedName("createdAt")
    private String createdAt;
    
    @SerializedName("updatedAt")
    private String updatedAt;
    
    // Inner class for PriceTable
    public static class PriceTable {
        @SerializedName("standard")
        private double standard;
        
        @SerializedName("vip")
        private double vip;
        
        @SerializedName("earlyBirdDiscount")
        private double earlyBirdDiscount;
        
        @SerializedName("earlyBirdEndTime")
        private String earlyBirdEndTime;
        
        public double getStandard() {
            return standard;
        }
        
        public void setStandard(double standard) {
            this.standard = standard;
        }
        
        public double getVip() {
            return vip;
        }
        
        public void setVip(double vip) {
            this.vip = vip;
        }
        
        public double getEarlyBirdDiscount() {
            return earlyBirdDiscount;
        }
        
        public void setEarlyBirdDiscount(double earlyBirdDiscount) {
            this.earlyBirdDiscount = earlyBirdDiscount;
        }
        
        public String getEarlyBirdEndTime() {
            return earlyBirdEndTime;
        }
        
        public void setEarlyBirdEndTime(String earlyBirdEndTime) {
            this.earlyBirdEndTime = earlyBirdEndTime;
        }
    }
    
    public Schedule() {}
    
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
    
    // Get scheduleId (alias for _id)
    public String getScheduleId() {
        return getId();
    }
    
    public String getMovieId() {
        return movieId;
    }
    
    public void setMovieId(String movieId) {
        this.movieId = movieId;
    }
    
    public String getCinemaId() {
        return cinemaId;
    }
    
    public void setCinemaId(String cinemaId) {
        this.cinemaId = cinemaId;
    }
    
    public String getRoomId() {
        return roomId;
    }
    
    public void setRoomId(String roomId) {
        this.roomId = roomId;
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
    
    public PriceTable getPriceTable() {
        return priceTable;
    }
    
    public void setPriceTable(PriceTable priceTable) {
        this.priceTable = priceTable;
    }
    
    // Get base price (standard or vip)
    public double getPrice() {
        if (priceTable != null) {
            // Default to standard price
            return priceTable.getStandard();
        }
        return 0;
    }
    
    // Get price for seat type
    public double getPriceForSeatType(String seatType) {
        if (priceTable == null) {
            return 0;
        }
        if ("vip".equalsIgnoreCase(seatType)) {
            return priceTable.getVip();
        }
        return priceTable.getStandard();
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public boolean isFull() {
        return isFull;
    }
    
    public void setFull(boolean full) {
        isFull = full;
    }
    
    public boolean is3d() {
        return is3d;
    }
    
    public void setIs3d(boolean is3d) {
        this.is3d = is3d;
    }
    
    public boolean hasSubtitles() {
        return hasSubtitles;
    }
    
    public void setHasSubtitles(boolean hasSubtitles) {
        this.hasSubtitles = hasSubtitles;
    }
    
    public boolean isDubbed() {
        return isDubbed;
    }
    
    public void setIsDubbed(boolean isDubbed) {
        this.isDubbed = isDubbed;
    }
    
    public String getNotes() {
        return notes;
    }
    
    public void setNotes(String notes) {
        this.notes = notes;
    }
    
    public String getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
    
    public String getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
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
        double price = getPrice();
        return String.format("%.0f", price) + "₫";
    }
    
    // Check if schedule is available for booking
    public boolean isAvailable() {
        return "scheduled".equals(status) && !isFull;
    }
}

