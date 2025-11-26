package vchung.ph59842.app_datve.data;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

public class MembershipStore {
    private static final String PREF = "membership_store";
    private static final String KEY_SNAPSHOT = "snapshot";

    public static void saveSnapshot(Context ctx, String json) {
        try {
            if (json == null) return;
            new JSONObject(json); // validate
            SharedPreferences sp = ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE);
            sp.edit().putString(KEY_SNAPSHOT, json).apply();
        } catch (Exception ignore) {}
    }

    public static String getSnapshot(Context ctx) {
        SharedPreferences sp = ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE);
        return sp.getString(KEY_SNAPSHOT, null);
    }
}
