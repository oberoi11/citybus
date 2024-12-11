import React, { useEffect, useState } from "react";
import { Row, Col } from "antd";
import "../resourses/bus.css";
import { axiosInstance } from "../helpers/axiosInstance";
import { useDispatch, useSelector } from "react-redux";
import io from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["websocket", "polling"],
});

function SeatSelection({ selectedSeats, setSelectedSeats, bus }) {
  const [reservedSeats, setReservedSeats] = useState([]);
  const { user } = useSelector((state) => state.users);
  const capacity = bus.capacity;

  const fetchReservedSeats = async () => {
    const response = await axiosInstance.post("/api/buses/get-bus-by-id", { _id: bus._id });
    if (response.data.success) {
      setReservedSeats(response.data.data.reservedSeats);
    }
  };

  useEffect(() => {
    fetchReservedSeats();

    socket.on("seat-selected", (data) => {
      if (data.busId === bus._id) {
        setReservedSeats((prevReservedSeats) => {
          if (!prevReservedSeats.some(seat => seat.seatNumber === data.seatNumber)) {
            return [...prevReservedSeats, { seatNumber: data.seatNumber, user: data.user }];
          }
          return prevReservedSeats;
        });
      }
    });
    
    socket.on("seat-unreserved", (data) => {
      if (data.busId === bus._id) {
        setReservedSeats((prevReservedSeats) =>
          prevReservedSeats.filter((seat) => seat.seatNumber !== data.seatNumber)
        );
      }
    });
    return () => {
      socket.off("seat-selected");
      socket.off("seat-unreserved");
    };
  }, [bus._id]);

  const selectOrUnselectSeats = (seatNumber) => {
    const isReserved = reservedSeats.some(
      (reservedSeat) => reservedSeat.seatNumber === seatNumber
    );
    const isBooked = bus.seatsBooked && bus.seatsBooked.includes(seatNumber);

    const isReservedByUser = reservedSeats.some(
      (reservedSeat) => reservedSeat.seatNumber === seatNumber && reservedSeat.user === user._id
    );
    const isReservedByOtherUser = reservedSeats.some(
      (reservedSeat) => reservedSeat.seatNumber === seatNumber && reservedSeat.user !== user._id
    );
    if (isReservedByOtherUser || isBooked) return;

    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats((prevSelectedSeats) =>
        prevSelectedSeats.filter((seat) => seat !== seatNumber)
      );
      axiosInstance.post("/api/bookings/unreserve-seat", {
        busId: bus._id,
        seatNumber,
      });
    } else {
      setSelectedSeats((prevSelectedSeats) => [...prevSelectedSeats, seatNumber]);
      axiosInstance.post("/api/bookings/reserve-seat", {
        busId: bus._id,
        seatNumber,
      });
    }
  };

  return (
    <div className="mx-5">
      <div className="bus-container">
        <Row gutter={[10, 10]}>
          {Array.from(Array(capacity).keys()).map((seat) => {
            let seatClass = "";
            const seatNumber = seat + 1;
            const isReservedByUser = reservedSeats.some(
              (reservedSeat) => reservedSeat.seatNumber === seatNumber && reservedSeat.user === user._id
            );
            const isReservedByOtherUser = reservedSeats.some(
              (reservedSeat) => reservedSeat.seatNumber === seatNumber && reservedSeat.user !== user._id
            );
            const isBooked = bus.seatsBooked && bus.seatsBooked.includes(seatNumber);

            if (selectedSeats.includes(seatNumber)) {
              seatClass = "selected-seat";
            } else if (isReservedByUser) {
              seatClass = "reserved-by-you";
            } else if (isReservedByOtherUser) {
              seatClass = "reserved-seat";
            } else if (isBooked) {
              seatClass = "booked-seat";
            }

            return (
              <Col span={6} key={seat}>
                <div
                  className={`seat ${seatClass}`}
                  onClick={() => selectOrUnselectSeats(seatNumber)}
                  style={{
                    pointerEvents: isReservedByOtherUser || isBooked ? "none" : "auto",
                  }}
                >
                  {seatNumber}
                </div>
              </Col>
            );
          })}
        </Row>
      </div>
    </div>
  );
}

export default SeatSelection;
