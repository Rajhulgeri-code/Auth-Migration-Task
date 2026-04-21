#!/bin/bash

# Read challenge (remove newline)
challenge=$(cat challenge.txt | tr -d '\n')

# Get latest commit hash
commit=$(git rev-parse HEAD)

echo "Commit: $commit"

# Concatenate
data="${challenge}${commit}"

# Compute SHA256
hash=$(echo -n "$data" | sha256sum | awk '{print $1}')

echo "SHA256: $hash"

# Generate private key
openssl ecparam -genkey -name prime256v1 -noout -out private.pem

# Generate public key
openssl ec -in private.pem -pubout -out proof_pub.pem

# Sign hash
echo -n "$hash" | openssl dgst -sha256 -sign private.pem -out proof.txt

echo "Proof generated successfully"