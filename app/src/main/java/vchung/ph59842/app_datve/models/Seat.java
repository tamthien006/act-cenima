package vchung.ph59842.app_datve.models;

import com.google.gson.annotations.SerializedName;

public class Seat {
    @SerializedName("code")
    private String code;
    
    @SerializedName("type")
    private String type; // "vip" or "standard"
    
    @SerializedName("row")
    private int row;
    
    @SerializedName("column")
    private int column;
    
    @SerializedName("status")
    private String status; // "available" or "booked"
    
    public Seat() {}
    
    public String getCode() {
        return code;
    }
    
    public void setCode(String code) {
        this.code = code;
    }
    
    public String getType() {
        return type;
    }
    
    public void setType(String type) {
        this.type = type;
    }
    
    public int getRow() {
        return row;
    }
    
    public void setRow(int row) {
        this.row = row;
    }
    
    public int getColumn() {
        return column;
    }
    
    public void setColumn(int column) {
        this.column = column;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public boolean isAvailable() {
        return "available".equals(status);
    }
    
    public boolean isBooked() {
        return "booked".equals(status);
    }
    
    public boolean isVip() {
        return "vip".equals(type);
    }
}




