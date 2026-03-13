# AES + LSB Image Steganography Tool

## Overview

This project implements a secure data hiding system by combining:

- AES encryption
- LSB image steganography

The system encrypts secret messages using AES and hides the encrypted data inside an image using the Least Significant Bit (LSB) technique.

The goal is to provide an additional security layer for transmitting confidential information.

---

## Features

- AES encryption and decryption
- Hide encrypted messages inside images
- Extract hidden messages from images
- Image quality evaluation using MSE, PSNR, SSIM
- Image comparison tools (Histogram, Heatmap, Difference map)

---

## Technologies

- HTML
- CSS
- JavaScript
- CryptoJS library
- HTML Canvas API

---

## System Architecture

The application consists of several modules:

- User Interface (HTML, CSS)
- AES Encryption Module
- LSB Steganography Module
- Image Processing Module
- Image Quality Evaluation Module

---

## Encryption Process

1. User enters a secret message.
2. The message is encrypted using AES.
3. The encrypted data is converted to binary.
4. Binary data is embedded into image pixels using LSB.
5. A new image (stego image) is generated.

---

## Extraction Process

1. User loads the stego image.
2. Binary data is extracted from image pixels.
3. Extracted data is decrypted using AES.
4. The original message is recovered.

---

## Image Quality Metrics

The system evaluates image quality using:

- MSE (Mean Squared Error)
- PSNR (Peak Signal-to-Noise Ratio)
- SSIM (Structural Similarity Index)

These metrics measure how similar the stego image is to the original image.

---

## Author

QuocDanh  
Cybersecurity Student
