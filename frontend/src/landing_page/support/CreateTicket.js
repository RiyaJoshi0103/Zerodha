import React from "react";

const ticketTopics = [
  "Online Account Opening",
  "Offline Account Opening",
  "Company, Partnership and HUF Account",
  "Opening",
  "NRI Account Opening",
  "Charges at Zerodha",
  "Zerodha IDFC FIRST Bank 3-in-1 Account",
  "Getting Started",
];

// Repeat this section 3 times for layout (6 is redundant and bad for UX unless necessary)
const sections = Array(3).fill(ticketTopics);

function CreateTicket() {
  return (
    <div className="container">
      <div className="row p-5 mt-5 mb-5">
        <h1 className="fs-2 mb-4">
          To create a ticket, select a relevant topic
        </h1>
        {sections.map((topics, index) => (
          <div className="col-md-4 p-3" key={index}>
            <h4>
              <i className="fa fa-plus-circle me-2" aria-hidden="true"></i>{" "}
              Account Opening
            </h4>
            {topics.map((topic, idx) => (
              <div key={idx}>
                <a
                  href="#"
                  style={{ textDecoration: "none", lineHeight: "2.5" }}>
                  {topic}
                </a>
                <br />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CreateTicket;
