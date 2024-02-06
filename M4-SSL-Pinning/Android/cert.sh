#!/bin/bash

# alias 0
#MY_SERVER="www.syxra.cz"

# alias 1
MY_SERVER="rtm.thinx.cloud"

echo | openssl s_client -connect ${MY_SERVER}:443 2>&1 | \
 sed -ne '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p' > cert.pem

export CLASSPATH=$(pwd)/tools/bcprov-jdk18on-177.jar
CERTSTORE=app/src/main/res/raw/keystore.bks

#if [ -a $CERTSTORE ]; then
#    rm $CERTSTORE || exit 1
#fi

keytool \
      -import \
      -v \
      -trustcacerts \
      -alias 1 \
      -file ./cert.pem \
      -keystore $CERTSTORE \
      -storetype BKS \
      -provider org.bouncycastle.jce.provider.BouncyCastleProvider \
      -providerpath $(pwd)/tools/bcprov-jdk18on-177.jar \
      -storepass sslpinning.corpus.cz