#!/bin/bash
challenge=$(cat challenge.txt | tr -d '\n')
commit=$(git -C .. rev-parse HEAD)
echo "Commit: $commit"
data="${challenge}${commit}"
hash=$(echo -n "$data" | sha256sum | awk '{print $1}')
echo "SHA256: $hash"
openssl ecparam -genkey -name prime256v1 -noout -out private.pem
openssl ec -in private.pem -pubout -out proof_pub.pem
echo -n "$hash" | openssl dgst -sha256 -sign private.pem -out proof.txt
echo "Proof generated successfully"
