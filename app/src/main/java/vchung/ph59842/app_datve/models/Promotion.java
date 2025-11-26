package vchung.ph59842.app_datve.models;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class Promotion {
    @SerializedName("_id")
    private String _id;
    
    @SerializedName("id")
    private String id;
    
    @SerializedName("code")
    private String code;
    
    @SerializedName("name")
    private String name;
    
    @SerializedName("description")
    private String description;
    
    @SerializedName("discountType")
    private String discountType; // "percentage" or "fixed"
    
    @SerializedName("type")
    private String type; // Backend uses "type" with values "percent" or "fixed"
    
    @SerializedName("discountValue")
    private double discountValue;
    
    @SerializedName("value")
    private Double value; // Backend uses "value" instead of "discountValue"
    
    @SerializedName("maxDiscount")
    private Double maxDiscount; // Có thể null
    
    @SerializedName("minOrderValue")
    private Double minOrderValue;
    
    @SerializedName("minPurchase")
    private Double minPurchase; // Alias cho minOrderValue
    
    @SerializedName("minOrderAmount")
    private Double minOrderAmount; // Backend uses "minOrderAmount"
    
    @SerializedName("startDate")
    private String startDate;
    
    @SerializedName("endDate")
    private String endDate;
    
    @SerializedName("isActive")
    private boolean isActive;
    
    @SerializedName("usageLimit")
    private Integer usageLimit; // Có thể là "unlimited" trong API nhưng parse thành Integer
    
    @SerializedName("maxUses")
    private Integer maxUses; // Backend uses "maxUses"
    
    @SerializedName("usedCount")
    private int usedCount;
    
    @SerializedName("currentUses")
    private Integer currentUses; // Backend uses "currentUses"
    
    @SerializedName("applicableMovies")
    private List<String> applicableMovies;

    public Promotion() {}

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

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getDiscountType() {
        // Backend uses "type" with "percent" or "fixed", map to "percentage" or "fixed"
        if (type != null) {
            if ("percent".equals(type)) {
                return "percentage";
            } else if ("fixed".equals(type)) {
                return "fixed";
            }
        }
        return discountType != null ? discountType : (type != null ? type : "fixed");
    }

    public void setDiscountType(String discountType) {
        this.discountType = discountType;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public double getDiscountValue() {
        // Backend uses "value" instead of "discountValue"
        if (value != null) {
            return value;
        }
        return discountValue;
    }

    public void setDiscountValue(double discountValue) {
        this.discountValue = discountValue;
    }

    public Double getValue() {
        return value;
    }

    public void setValue(Double value) {
        this.value = value;
    }

    public Double getMaxDiscount() {
        return maxDiscount;
    }

    public void setMaxDiscount(Double maxDiscount) {
        this.maxDiscount = maxDiscount;
    }

    public Double getMinOrderValue() {
        // Backend uses "minOrderAmount"
        if (minOrderAmount != null) {
            return minOrderAmount;
        }
        return minOrderValue != null ? minOrderValue : minPurchase;
    }

    public void setMinOrderValue(Double minOrderValue) {
        this.minOrderValue = minOrderValue;
    }

    public Double getMinPurchase() {
        return minPurchase != null ? minPurchase : (minOrderValue != null ? minOrderValue : minOrderAmount);
    }

    public void setMinPurchase(Double minPurchase) {
        this.minPurchase = minPurchase;
    }

    public Double getMinOrderAmount() {
        return minOrderAmount;
    }

    public void setMinOrderAmount(Double minOrderAmount) {
        this.minOrderAmount = minOrderAmount;
    }

    public String getStartDate() {
        return startDate;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }

    public String getEndDate() {
        return endDate;
    }

    public void setEndDate(String endDate) {
        this.endDate = endDate;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public Integer getUsageLimit() {
        // Backend uses "maxUses" instead of "usageLimit"
        return maxUses != null ? maxUses : usageLimit;
    }

    public void setUsageLimit(Integer usageLimit) {
        this.usageLimit = usageLimit;
    }

    public Integer getMaxUses() {
        return maxUses;
    }

    public void setMaxUses(Integer maxUses) {
        this.maxUses = maxUses;
    }

    public int getUsedCount() {
        // Backend uses "currentUses" instead of "usedCount"
        return currentUses != null ? currentUses : usedCount;
    }

    public void setUsedCount(int usedCount) {
        this.usedCount = usedCount;
    }

    public Integer getCurrentUses() {
        return currentUses;
    }

    public void setCurrentUses(Integer currentUses) {
        this.currentUses = currentUses;
    }

    public List<String> getApplicableMovies() {
        return applicableMovies;
    }

    public void setApplicableMovies(List<String> applicableMovies) {
        this.applicableMovies = applicableMovies;
    }

    // Helper methods
    public String getFormattedDiscount() {
        String discountTypeStr = getDiscountType(); // This handles mapping from "percent" to "percentage"
        double discountValueNum = getDiscountValue(); // This handles mapping from "value" to "discountValue"
        
        if ("percentage".equals(discountTypeStr) || "percent".equals(discountTypeStr)) {
            return (int) discountValueNum + "%";
        } else {
            // Fixed discount
            int value = (int) discountValueNum;
            if (value >= 1000) {
                return (value / 1000) + "K";
            }
            return String.valueOf(value);
        }
    }

    public String getFormattedDiscountValue() {
        String discountTypeStr = getDiscountType();
        double discountValueNum = getDiscountValue();
        
        if ("percentage".equals(discountTypeStr) || "percent".equals(discountTypeStr)) {
            return (int) discountValueNum + "%";
        } else {
            int value = (int) discountValueNum;
            if (value >= 1000) {
                return (value / 1000) + "K";
            }
            return String.valueOf(value);
        }
    }

    public boolean isExpired() {
        if (endDate == null) return false;
        try {
            java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US);
            sdf.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
            java.util.Date end = sdf.parse(endDate);
            return end != null && end.before(new java.util.Date());
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isAvailable() {
        // Check if promotion is active
        if (!isActive) {
            return false;
        }
        
        // Check if expired
        if (isExpired()) {
            return false;
        }
        
        // Check usage limit (backend uses maxUses and currentUses)
        Integer limit = getUsageLimit(); // This will return maxUses or usageLimit
        int used = getUsedCount(); // This will return currentUses or usedCount
        
        if (limit != null && used >= limit) {
            return false;
        }
        
        return true;
    }
}

