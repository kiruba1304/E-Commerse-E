import React, { useState } from 'react';

// Utility function to load the Razorpay script dynamically
const loadScript = (src) => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const PaymentComponent = () => {
    const [amount, setAmount] = useState(500); // Example amount: 500 INR

    const handlePayment = async () => {
        // 1. Load Razorpay Script
        const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
        if (!res) {
            alert('Razorpay SDK failed to load. Are you online?');
            return;
        }

        // 2. Ask Backend to Create an Order
        const orderResponse = await fetch('http://localhost:5000/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount }) // Sending amount in INR
        });
        const orderData = await orderResponse.json();

        if (orderData.status !== 'success') {
            alert('Server error. Are you sure the backend is running?');
            return;
        }

        // 3. Setup Razorpay Options
        const options = {
            key: "YOUR_RAZORPAY_KEY_ID", // Enter the Key ID generated from the Dashboard
            amount: orderData.amount, // Amount is in currency subunits (paise)
            currency: orderData.currency,
            name: "Your Company Name",
            description: "Test Transaction",
            image: "https://your-logo-url.png",
            order_id: orderData.order_id, // The order_id created in the backend
            handler: async function (response) {
                // 4. Send Payment details to backend for Verification
                const verifyResponse = await fetch('http://localhost:5000/api/verify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                    })
                });
                
                const verifyData = await verifyResponse.json();
                
                if (verifyData.status === 'success') {
                    alert('Payment Successful and Verified!');
                } else {
                    alert('Payment Verification Failed!');
                }
            },
            prefill: {
                name: "John Doe",
                email: "johndoe@example.com",
                contact: "9999999999"
            },
            theme: {
                color: "#3399cc"
            }
        };

        // 5. Open Razorpay Checkout Window
        const paymentObject = new window.Razorpay(options);
        paymentObject.open();
    };

    return (
        <div style={{ padding: '50px', textAlign: 'center' }}>
            <h2>Razorpay Integration Testing</h2>
            <p>Pay ₹{amount}</p>
            <button 
                onClick={handlePayment} 
                style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#3399cc', color: '#fff', border: 'none', borderRadius: '5px' }}
            >
                Pay Now
            </button>
        </div>
    );
};

export default PaymentComponent;
