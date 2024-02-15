package cz.corpus.sslpinning

import com.google.gson.annotations.SerializedName

data class Fingerprints (

  @SerializedName("name"        ) var name        : String? = null,
  @SerializedName("fingerprint" ) var fingerprint : String? = null,
  @SerializedName("expires"     ) var expires     : Int?    = null

)