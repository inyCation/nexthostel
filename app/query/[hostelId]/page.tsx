"use client"
import React, { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaDollarSign, FaUsers, FaMapPin, FaInfoCircle } from 'react-icons/fa';
import Link from 'next/link';
import axios from 'axios';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import toast, { Toaster } from 'react-hot-toast';
import "@/styles/main.scss";

import "./style.scss";
import { useAppSelector } from '@/lib/hooks';
import Amenities from '@/components/amenities/Amenities';

import "@/styles/mediaQuery.scss";

interface Hostel {
  id: number;
  title: string;
  description: string;
  location: string;
  capacity: number;
  pincode: string;
  amenities: string[];
  imageURLs: string[];
  owner: string;
  price: number;
  createdAt: string;
}

const Page = ({ params }: { params: any }) => {
  const [hostel, setHostel] = useState<Hostel | null>(null);

  const [bookingDetails, setBookingDetails] = useState({
    checkInDate: '',
    checkOutDate: '',
    numberOfPersons: '1'
  });
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [totalWithGST, setTotalWithGST] = useState<number>(0);
  const [GST, setGST] = useState<number>(0);

  const [fetchError, setFetchError] = useState<boolean>(false);

  const userEmail = useAppSelector((state) => state.loggedIn.userEmail);
  const hostelId = params.hostelId;

  useEffect(() => {
    let fetchTimeout: NodeJS.Timeout;

    // Function to fetch hostel details
    const fetchHostelDetails = async () => {
      try {
        const response = await fetch(`/api/hostel/${params.hostelId}`);
        const data = await response.json();
        setHostel(data.hostel[0]);
      } catch (error) {
        console.error('Error fetching hostel details:', error);
        setFetchError(true); // Set fetch error state if fetch fails
      }
    };

    // Race between fetch operation and timeout
    const fetchDataWithTimeout = async () => {
      fetchTimeout = setTimeout(() => {
        setFetchError(true); // Set fetch error if fetch takes longer than 5 seconds
      }, 5000); // 5 seconds timeout

      await Promise.race([fetchHostelDetails(), new Promise((resolve) => setTimeout(resolve, 5000))]); // Wait for either fetch or timeout
      clearTimeout(fetchTimeout); // Clear the timeout if fetch completes within time
    };

    fetchDataWithTimeout(); // Initiate fetch operation

    return () => {
      clearTimeout(fetchTimeout); // Clean up timeout on component unmount
    };
  }, [params.hostelId]);

  if (fetchError) {
    return <div>Error: Failed to fetch hostel details.</div>;
  }

  if (!hostel) {
    return <div>Loading...</div>;
  }


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBookingDetails(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate form inputs
    if (!bookingDetails.checkInDate) {
      toast.error('Please select a check-in date!');
      return;
    }
    if (!bookingDetails.checkOutDate) {
      toast.error('Please select a check-out date!');
      return;
    }

    const currentDate = new Date();
    const checkInDate = new Date(bookingDetails.checkInDate);
    const checkOutDate = new Date(bookingDetails.checkOutDate);

    // Check if check-in date is before today's date (allowing today's date)
    if (checkInDate < currentDate && !isSameDay(checkInDate, currentDate)) {
      toast.error('Check-in date cannot be in the past!');
      return;
    }

    // Validate check-out date is after check-in date
    if (checkOutDate < checkInDate) {
      toast.error('Check-out date must be after check-in date!');
      return;
    }

    // Calculate number of days of stay
    const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
    const numberOfDays = timeDiff > 0 ? Math.ceil(timeDiff / (1000 * 3600 * 24)) : 1;

    // Calculate total price including GST
    const totalPriceLoc = numberOfDays * hostel!.price;
    const totalWithGSTLoc = totalPriceLoc * 1.18;
    const gstAmountLoc = totalWithGSTLoc - totalPriceLoc;

    // Set state for displaying results
    setTotalPrice(totalPriceLoc);
    setTotalWithGST(totalWithGSTLoc);
    setGST(gstAmountLoc);

    // Display total price including GST
    toast.success(`Total Price (incl. GST): $${totalWithGSTLoc.toFixed(2)}`);


    const noOfPerson = bookingDetails.numberOfPersons



    try {

      const book = async () => {
        return await axios.post('/api/hostel/hostelbooking', {

          userEmail,
          checkInDate,
          checkOutDate,
          totalPrice: totalPriceLoc.toFixed(2),
          GST: gstAmountLoc.toFixed(2),
          hostelId,
          noOfPerson
        })
      }


      toast.promise(
        book().then((res) => {
          return res;
        }).catch((err) => {
          throw err;
        }),
        {
          loading: 'Booking Hostel... Hold On',
          success: (res) => {
            console.log(`
              Booking Details:
              User Email: ${userEmail}
              Check-in Date: ${checkInDate}
              Check-out Date: ${checkOutDate}
              Total Price: ${totalPriceLoc}
              GST: ${gstAmountLoc}
              Hostel ID: ${hostelId}
              Number of Persons: ${noOfPerson}
            `);

            return <b>{res.data!.message}</b>
          },
          error: (err) => <b>{err.response!.data.error}</b>,
        }
      );
    } catch (error: any) {
      toast.error(error.message);
    }





    setBookingDetails({

      checkInDate: '',
      checkOutDate: '',
      numberOfPersons: '1',
    });
  };

  // Helper function to compare if two dates are the same day
  function isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  if (!hostel) {
    return <div>Loading...</div>;
  }

  const numberOfPersonsOptions = Array.from({ length: hostel.capacity }, (_, index) => index + 1);

  // Slider settings
  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
  };

  return (
    <>
      <Toaster
        position="top-center"
        reverseOrder={false}
      />
      <Slider {...sliderSettings}>
        {hostel.imageURLs.map((imageUrl, index) => (
          <div key={index}>
            <img src={imageUrl} alt={`Image ${index}`} style={{ width: '90vw', maxHeight: '400px', objectFit: 'contain' }} />
          </div>
        ))}
      </Slider>
      <div className='hostelDetailsPage'>
        <div className='left'>
          <div className="aboutHostel">
            <div className="hostel__title">
              {hostel.title}
            </div>
            <div className="hostel__description">{hostel.description}</div>
            <div className="hostel__location">
              <FaMapMarkerAlt className="hostel__icon" />
              Location: {hostel.location}
            </div>
            <div className="hostel__price">
              <FaDollarSign className="hostel__icon" />
              Price: {hostel.price}
            </div>
            <div className="hostel__capacity">
              <FaUsers className="hostel__icon" />
              Capacity: {hostel.capacity}
            </div>
            <div className="hostel__pincode">
              <FaMapPin className="hostel__icon" />
              Pincode: {hostel.pincode}
            </div>
          </div>

          <div className='amenities'>
            <h3>Amenities:</h3>
            <ul>
              {hostel.amenities.map((amenity, index) => (
                <Amenities index={index} amenity={amenity} />
              ))}
            </ul>
          </div>
        </div>
        <div className="right">
          <div className="bookingForm">
            <h2>Book Now</h2>
            <form onSubmit={handleFormSubmit}>
              <label>
                Check-in Date:
                <input type="date" name="checkInDate" value={bookingDetails.checkInDate} onChange={handleInputChange} />
              </label>
              <label>
                Check-out Date:
                <input type="date" name="checkOutDate" value={bookingDetails.checkOutDate} onChange={handleInputChange} />
              </label>
              <label>
                Number of Persons:
                <select name="numberOfPersons" value={bookingDetails.numberOfPersons} onChange={handleInputChange}>
                  {numberOfPersonsOptions.map((option) => (
                    <option key={option} value={option}>{option} person{option !== 1 ? 's' : ''}</option>
                  ))}
                </select>
              </label>
              <input type="submit" value={"Book Now"} className='btn' />
              <p>Total Price (incl. GST): ${totalWithGST.toFixed(2)}</p>
              <p>Total Price: ${totalPrice.toFixed(2)}</p>
              <p>GST Amount: ${GST.toFixed(2)}</p>
            </form>
          </div>
        </div>
      </div>
    </>

  );
};

export default Page;
