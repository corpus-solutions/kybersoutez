package cz.corpus.sslpinning

import com.google.gson.annotations.SerializedName

data class PinningModel (

  @SerializedName("timestamp"    ) var timestamp    : Int?                    = null,
  @SerializedName("fingerprints" ) var fingerprints : ArrayList<Fingerprints> = arrayListOf()

)