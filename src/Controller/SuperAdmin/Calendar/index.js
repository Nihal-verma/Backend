const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")
const connection = require("../../../../mysql");
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.EMAIL_API_KEY;
const senderMail = process.env.EMAIL;

// -----------------------------------Calendar events-------------------------------

const calendarEvents = (req, res) => {
    try {
      const { events } = req.body;
      if (!events || events?.length === 0) {
        return res.json({ message: "No events provided", success: false });
      }
  
      const eventTitle = [];
      const companyId = [];
      const eventType = [];
      const eventDate = [];
      const company = [];
  
      for (const event of events) {
        const titleIndex = eventTitle.indexOf(event.title);
  
        if (titleIndex === -1) {
          eventTitle.push(event.title);
          companyId.push(event.companyId);
          eventType.push(event.eventType);
          eventDate.push([event.date]);
          company.push(event.company);
        } else {
          // If the event title already exists, update the date
          eventDate[titleIndex].push(event.date);
        }
      }
  
      const latestCompanyId = companyId.slice(-1);
  
      const selectSql = "SELECT * FROM trialEvents WHERE comp_id = ?";
      const insertSql = "INSERT INTO trialEvents (title, comp_id, company, date, eventType) VALUES (?, ?, ?, ?, ?)";
      const updateSql = "UPDATE trialEvents SET date = ? WHERE comp_id = ? AND title = ?";
      const updateCompanySql = "UPDATE lms_CourseCompany SET end_date = ? WHERE comp_id = ?";
      const updateEmployeeSql = "UPDATE lms_courseEmployee SET end_date = ? WHERE comp_id = ?";
  
      let promises = [];
  
      for (let i = 0; i < companyId?.length; i++) {
        promises.push(new Promise((resolve, reject) => {
          connection.query(selectSql, [companyId[i]], (selectErr, results) => {
            if (selectErr) {
              reject(selectErr);
            }
  
            if (results?.length == 0) {
              const sortedDate = eventDate[i].sort();
              connection.query(insertSql, [eventTitle[i], latestCompanyId[0], company[i], JSON.stringify(sortedDate), eventType[i]], (insertErr) => {
                if (insertErr) {
                  reject(insertErr);
                } else {
                  resolve();
                }
              });
            } else {
              const sortedDate = eventDate[i].sort();
              connection.query(updateSql, [JSON.stringify(sortedDate), companyId[i], eventTitle[i]], (updateErr) => {
                if (updateErr) {
                  reject(updateErr);
                } else {
                  resolve();
                }
              });
            }
          });
        }));
      }
  
      Promise.all(promises)
        .then(() => {
          const largestDates = [];
  
          for (let i = 0; i < companyId?.length; i++) {
            const currentCompanyId = companyId[i];
            const currentEventDate = eventDate[i];
            const sortedDate = currentEventDate.sort((a, b) => new Date(b) - new Date(a));
            largestDates.push({ id: currentCompanyId, date: sortedDate[0] });
          }
  
          let companyPromises = [];
  
          for (let i = 0; i < largestDates?.length; i++) {
            companyPromises.push(new Promise((resolve, reject) => {
              connection.query(updateCompanySql, [largestDates[i].date, largestDates[i].id], (updateErr) => {
                if (updateErr) {
                  reject(updateErr);
                } else {
                  resolve();
                }
              });
            }));
          }
  
          let employeePromises = [];
  
          for (let i = 0; i < largestDates?.length; i++) {
            employeePromises.push(new Promise((resolve, reject) => {
              connection.query(updateEmployeeSql, [largestDates[i].date, largestDates[i].id], (updateErr) => {
                if (updateErr) {
                  reject(updateErr);
                } else {
                  resolve();
                }
              });
            }));
          }
  
          Promise.all([...companyPromises, ...employeePromises])
            .then(() => {
              return res.json({ message: "done", success: true });
            })
            .catch((updateErr) => {
              console.error(updateErr);
              return res.json({ message: "Error updating lms_CourseCompany or lms_courseEmployee", error: updateErr, success: false });
            });
        })
        .catch((error) => {
          console.error("Error in calendarEvents:", error);
          return res.json({ message: "Error occurred", error: error, success: false });
        });
  
    } catch (error) {
      console.error("Error in calendarEvents:", error);
      return res.json({ message: "Error occurred", error: error, success: false });
    }
  };
  
  // --------------------------working
  // const calendarEvents = (req, res) => {
  //   try {
  //     const { events } = req.body;
  //     console.log("events", events);
  
  //     if (!events || events?.length === 0) {
  //       return res.json({ message: "No events provided", success: false });
  //     }
  
  //     const insertSql = "INSERT INTO trialEvents (title, comp_id, company, date, eventType) VALUES (?, ?, ?, ?, ?)";
  //     const updateCompanySql = "UPDATE lms_CourseCompany SET end_date = ? WHERE comp_id = ?";
  //     const updateEmployeeSql = "UPDATE lms_courseEmployee SET end_date = ? WHERE comp_id = ?";
  
  //     let promises = [];
  
  //     for (const event of events) {
  //       const { title, companyId, company, date, eventType } = event;
  
       
  //         promises.push(new Promise((resolve, reject) => {
  //           connection.query(insertSql, [title, companyId, company, date, eventType], (err) => {
  //             if (err) {
  //               reject(err);
  //             } else {
  //               resolve();
  //             }
  //           });
  //         }));
        
  //     }
  
  //     Promise.all(promises)
  //       .then(() => {
  //         let companyPromises = [];
  
  //         for (const event of events) {
  //           const { companyId, date } = event;
  //           const latestDate = date.sort((a, b) => new Date(b) - new Date(a))[0];
  //           companyPromises.push(new Promise((resolve, reject) => {
  //             connection.query(updateCompanySql, [latestDate, companyId], (updateErr) => {
  //               if (updateErr) {
  //                 reject(updateErr);
  //               } else {
  //                 resolve();
  //               }
  //             });
  //           }));
  //         }
  
  //         let employeePromises = [];
  
  //         for (const event of events) {
  //           const { companyId, date } = event;
  //           const latestDate = date.sort((a, b) => new Date(b) - new Date(a))[0];
  //           employeePromises.push(new Promise((resolve, reject) => {
  //             connection.query(updateEmployeeSql, [latestDate, companyId], (updateErr) => {
  //               if (updateErr) {
  //                 reject(updateErr);
  //               } else {
  //                 resolve();
  //               }
  //             });
  //           }));
  //         }
  
  //         Promise.all([...companyPromises, ...employeePromises])
  //           .then(() => {
  //             return res.json({ message: "done", success: true });
  //           })
  //           .catch((updateErr) => {
  //             console.error(updateErr);
  //             return res.json({ message: "Error updating lms_CourseCompany or lms_courseEmployee", error: updateErr, success: false });
  //           });
  //       })
  //       .catch((error) => {
  //         console.error("Error in calendarEvents:", error);
  //         return res.json({ message: "Error occurred", error: error, success: false });
  //       });
  
  //   } catch (error) {
  //     console.error("Error in calendarEvents:", error);
  //     return res.json({ message: "Error occurred", error: error, success: false });
  //   }
  // };
  
  const getCalendarEvents = async (req, res) => {
    try {
      // Fetch distinct dates from the table
      const distinctDatesQuery =
        "SELECT DISTINCT date, title,company, eventType FROM trialEvents";
      connection.query(
        distinctDatesQuery,
        (distinctDatesErr, distinctDatesResp) => {
          if (distinctDatesErr) {
            // return res.json({ message: "error occurred in distinct dates query", error: distinctDatesErr, success: false });
          }
  
          // Extract dates from the result
          const events = [];
  
          distinctDatesResp.forEach((row) => {
            const dates = JSON.parse(row.date);
  
            if (Array.isArray(dates)) {
              // If dates is an array, create an event for each date
              dates.forEach((date) => {
                const event = {
                  id: new Date().getTime(), // Generate a unique ID
                  title: row.title,
                  company: row.company,
                  date: new Date(date), // Format the date to Wed Jan 24 2024
                  eventType: row.eventType,
                };
                events.push(event);
              });
            } else {
              // If dates is a single value, create an event with that date
              const event = {
                id: new Date().getTime(), // Generate a unique ID
                title: row.title,
                company: row.company,
                date: new Date(dates), // Format the date to Wed Jan 24 2024
                eventType: row.eventType,
              };
              events.push(event);
            }
          });
          // console.log("event",events);
          return res.json({ message: "success", data: events, success: true });
        }
      );
    } catch (error) {
      console.log("error", error);
      return res.json({
        message: "error occurred",
        error: error,
        success: false,
      });
    }
  };
  
  const getCalendarFutureEvents = async (req, res) => {
    try {
      // Fetch distinct dates from the table
      const distinctDatesQuery =
        "SELECT DISTINCT date, title,comp_id, company, eventType FROM trialEvents";
      connection.query(
        distinctDatesQuery,
        (distinctDatesErr, distinctDatesResp) => {
          if (distinctDatesErr) {
            return res.json({
              message: "error occurred in distinct dates query",
              error: distinctDatesErr,
              success: false,
            });
          }
  // console.log("distinctDatesRespdistinctDatesResp",distinctDatesResp);
          // Extract dates from the result
          const events = [];
          let eventIdCounter = 1;
  
          distinctDatesResp.forEach((row) => {
            const dates = JSON.parse(row.date);
  
            if (Array.isArray(dates)) {
              // If dates is an array, create an event for each date
              dates.forEach((date) => {
                const event = {
                  id: new Date().getTime() + eventIdCounter++, // Generate a unique ID
                  title: row.title,
                  companyId: row.comp_id,
                  company: row.company,
                  date: new Date(date), // Format the date to Wed Jan 24 2024
                  eventType: row.eventType,
                };
  // console.log("eventevent",new Date(event.date));
  events.push(event);
                // // Check if the event date is greater than or equal to today
                // if (event.date >= new Date()) {
                //   events.push(event); 
                // }
              });
            } else {
              // If dates is a single value, create an event with that date
              const event = {
                id: new Date().getTime() + eventIdCounter++, // Generate a unique ID
                title: row.title,
                companyId: row.comp_id,
                company: row.company,
                date: new Date(dates), // Format the date to Wed Jan 24 2024
                eventType: row.eventType,
              };
  
              // Check if the event date is greater than or equal to today
              if (event.date >= new Date()) {
                events.push(event);
              }
            }
          });
          // console.log("events",events);
          return res.json({ message: "success", data: events, success: true });
        }
      );
    } catch (error) {
      console.log("error", error);
      return res.json({
        message: "error occurred",
        error: error,
        success: false,
      });
    }
  };
  
  // ------------------------------------Working
  // const getCalendarFutureEvents = async (req, res) => {
  //   try {
  //     // Fetch distinct dates from the table
  //     const distinctDatesQuery =
  //       "SELECT DISTINCT date, title, comp_id, company, eventType FROM trialEvents";
  //     connection.query(
  //       distinctDatesQuery,
  //       (distinctDatesErr, distinctDatesResp) => {
  //         if (distinctDatesErr) {
  //           return res.json({
  //             message: "error occurred in distinct dates query",
  //             error: distinctDatesErr,
  //             success: false,
  //           });
  //         }
          
  //         // Extract dates from the result
  //         const events = [];
  
  //         distinctDatesResp.forEach((row) => {
  //           const date = new Date(row.date);
  
  //           if (isNaN(date.getTime())) {
  //             console.error("Invalid date:", row.date);
  //             return; // Skip this row if the date is invalid
  //           }
  
  //           const event = {
  //             id: new Date().getTime() + events?.length + 1, // Generate a unique ID
  //             title: row.title,
  //             companyId: row.comp_id,
  //             company: row.company,
  //             date: date, // Format the date to Wed Jan 24 2024
  //             eventType: row.eventType,
  //           };
  
  //           // Check if the event date is greater than or equal to today
  //           if (event.date >= new Date()) {
  //             events.push(event);
  //           }
  //         });
  
  //         console.log("events", events);
  //         return res.json({ message: "success", data: events, success: true });
  //       }
  //     );
  //   } catch (error) {
  //     console.log("error", error);
  //     return res.json({
  //       message: "error occurred",
  //       error: error,
  //       success: false,
  //     });
  //   }
  // };
  
  const updatedDateData = async (req, res) => {
    try {
      const events = req.body.data;
      //   console.log("events", events);
  
      if (!events || events?.length === 0) {
        return res.json({ message: "No events provided", success: false });
      }
  
      // Create an object to store new date arrays for each companyId
      const updatedDatesMap = {};
  
      for (let event of events) {
        // If the companyId is not already in the map, initialize it with an empty array
        if (!updatedDatesMap[event.companyId]) {
          updatedDatesMap[event.companyId] = [];
        }
  
        // Push the new date to the array
        updatedDatesMap[event.companyId].push(event.date);
      }
  
      // Iterate over the map and update the database
      for (const [companyId, dates] of Object.entries(updatedDatesMap)) {
        // Get the last date from the array
        const lastDate = dates[dates?.length - 1];
  // console.log("lastDate",lastDate);
        // Update trialEvents table with the lastDate
        const updateEventSql = `UPDATE trialEvents SET date = ? WHERE comp_id = ?`;
  
        try {
          await new Promise((resolve, reject) => {
            connection.query(
              updateEventSql,
              [JSON.stringify(dates), companyId],
              async (err, updateResults) => {
                if (err) {
                  console.log(err);
                  reject(err);
                } else {
                  resolve(updateResults);
  
                  // Update the lms_CourseCompany table with the companyId and lastDate
                  const updateCompanySql = `UPDATE lms_CourseCompany SET end_date = ? WHERE comp_id = ?`;
  
                  try {
                    await new Promise((companyResolve, companyReject) => {
                      connection.query(
                        updateCompanySql,
                        [lastDate, companyId],
                        (companyErr, updateCompanyResults) => {
                          if (companyErr) {
                            console.log(companyErr);
                            companyReject(companyErr);
                          } else {
                            companyResolve(updateCompanyResults);
                          }
                        }
                      );
                    });
                  } catch (companyError) {
                    console.error(
                      "Error updating lms_CourseCompany:",
                      companyError
                    );
                    return res.json({
                      message: "Error updating lms_CourseCompany",
                      error: companyError,
                      success: false,
                    });
                  }
  
                  // Update the lms_courseEmployee table with the companyId and lastDate
                  const updateEmployeeSql = `UPDATE lms_courseEmployee SET end_date = ? WHERE comp_id = ?`;
  
                  try {
                    await new Promise((employeeResolve, employeeReject) => {
                      connection.query(
                        updateEmployeeSql,
                        [lastDate, companyId],
                        (employeeErr, updateEmployeeResults) => {
                          if (employeeErr) {
                            console.log(employeeErr);
                            employeeReject(employeeErr);
                          } else {
                            employeeResolve(updateEmployeeResults);
                          }
                        }
                      );
                    });
                  } catch (employeeError) {
                    console.error(
                      "Error updating lms_courseEmployee:",
                      employeeError
                    );
                    return res.json({
                      message: "Error updating lms_courseEmployee",
                      error: employeeError,
                      success: false,
                    });
                  }
                }
              }
            );
          });
        } catch (error) {
          console.error("Error updating trialEvents:", error);
          return res.json({
            message: "Error updating trialEvents",
            error: error,
            success: false,
          });
        }
      }
  
      return res.json({ message: "done", success: true });
    } catch (error) {
      console.log("error", error);
      return res.json({
        message: "error occurred",
        error: error,
        success: false,
      });
    }
  };
  
  const updatedCompData = async (req, res) => {
    try {
      const events = req.body.data;
  
      if (!events || events?.length === 0) {
        return res.json({ message: "No events provided", success: false });
      }
  
      // Create an object to store new date arrays for each companyId
      const updatedDatesMap = {};
  
      for (let event of events) {
        // If the companyId is not already in the map, initialize it with an empty array
        if (!updatedDatesMap[event.companyId]) {
          updatedDatesMap[event.companyId] = [];
        }
  
        // Push the new date to the array
        updatedDatesMap[event.companyId].push(event.date);
      }
  
      // Iterate over the map and update the database
      for (const [companyId, dates] of Object.entries(updatedDatesMap)) {
        const updateSql = `UPDATE trialEvents SET date = ? WHERE comp_id = ?`;
  // console.log("dates",dates[dates?.length - 1]);
        try {
          await new Promise((resolve, reject) => {
            connection.query(
              updateSql,
              [JSON.stringify(dates), companyId],
              async (err, results) => {
                if (err) {
                  console.log(err);
                  reject(err);
                } else {
                  resolve(results);
  
                  // Update the lms_CourseCompany table with the companyId and lastDate
                  const updateCompanySql = `UPDATE lms_CourseCompany SET end_date = ? WHERE comp_id = ?`;
  
                  try {
                    await new Promise((companyResolve, companyReject) => {
                      connection.query(
                        updateCompanySql,
                        [dates[dates?.length - 1], companyId],
                        (companyErr, updateCompanyResults) => {
                          if (companyErr) {
                            console.log(companyErr);
                            companyReject(companyErr);
                          } else {
                            companyResolve(updateCompanyResults);
                          }
                        }
                      );
                    });
                  } catch (companyError) {
                    console.error(
                      "Error updating lms_CourseCompany:",
                      companyError
                    );
                    return res.json({
                      message: "Error updating lms_CourseCompany",
                      error: companyError,
                      success: false,
                    });
                  }
                }
              }
            );
          });
        } catch (error) {
          console.error("Error updating event:", error);
          return res.json({
            message: "Error updating events",
            error: error,
            success: false,
          });
        }
      }
  
      return res.json({ message: "done", success: true });
    } catch (error) {
      console.log("error", error);
      return res.json({
        message: "error occurred",
        error: error,
        success: false,
      });
    }
  };
  
  const setEvent = async (req, res) => {
    try {
      const event = req.body.event;
  
      if (event?.length === 0) {
        return res.status(400).json({ message: "No event data provided" });
      }
  
      const data = event[0];
      const comp = data.company;
      const comp_id = data.companyId;
      const date = new Date(data.date);
  
      // Check if the event date is within 24 hours or one day ahead of the current date
      const currentDate = new Date();
      const oneDayAhead = new Date(currentDate);
      oneDayAhead.setDate(oneDayAhead.getDate() + 1);
  
      if (date <= currentDate || date > oneDayAhead) {
        return res.status(400).json({ message: "Event date is not valid" });
      }
  
      // Format date as MySQL datetime
      const formattedDate = date.toISOString().slice(0, 19).replace("T", " ");
  
      // Check if a row with the same company and date exists
      const checkIfExistsQuery =
        "SELECT * FROM lms_latestEvents WHERE comp_id = ? AND date = ?";
      connection.query(
        checkIfExistsQuery,
        [comp_id, formattedDate],
        (checkErr, checkResult) => {
          if (checkErr) {
            console.error(checkErr);
            return res.status(500).json({ message: "Fatal Error" });
          }
  
          if (checkResult?.length > 0) {
            // Row with the same company and date exists, return a message
            return res.status(400).json({
              message: "Event for the same company and date already exists",
            });
          } else {
            // Row does not exist, insert a new row
            const insertQuery =
              "INSERT INTO lms_latestEvents (comp_name, comp_id, date) VALUES (?, ?, ?)";
            connection.query(
              insertQuery,
              [comp, comp_id, formattedDate],
              (insertErr, insertResult) => {
                if (insertErr) {
                  console.error(insertErr);
                  return res.status(500).json({ message: "Fatal Error" });
                }
  
                return res.status(200).json({ message: "Event inserted successfully" });
              }
            );
          }
        }
      );
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };
  
  
  // ----------------------------------Working Important Api--------
  
  
  // const startDateAndEndDateOfCourseCompany = async (req, res) => {
  //   try {
  //     const companies = req.body.comp_names; // Assuming companies is an array of objects with companyId and companyName
  //     console.log("companies", companies);
  //     if (!companies || companies?.length === 0) {
  //       return res.json({ message: "Error", success: false });
  //     }
  //     // console.log("company",company);
  //     const results = [];
  //     let date = []
  //     // Iterate through each company object
  //     // console.log("companies.companyId]", companies.companyId);
  //     for (const company of companies) {
  //       const sql =
  //         "SELECT date FROM trialEvents WHERE comp_id = ?";
  //       const resp = await new Promise((resolve, reject) => {
  //         connection.query(sql, [company.companyId], (err, resp) => {
  //           if (err) {
  //             console.log("err", err);
  //             reject(err);
  //           }
  //           console.log("respresp", resp);
  //           resolve(resp);
  //         });
  //       });
  //       resp.map((v) => {
  //         date.push(v)
  //       })
  
  //       let sortedDate = date.sort((a, b) => {
  //         return new Date(a) - new Date(b)
  //       })
  //       console.log("sortedDate", sortedDate);
  //       const firstDate = sortedDate[0];
  //       const endDate = sortedDate[sortedDate?.length - 1];
  //       console.log("firstDate", firstDate.date);
  //       console.log("endDate", endDate);
  //       const formattedFirstDate = new Date(firstDate.date).toLocaleDateString("en-GB");
  //       const formattedEndDate = new Date(endDate.date).toLocaleDateString("en-GB");
  //       results.push({
  //         companyId: company.companyId,
  //         companyName: company.companyName,
  //         firstDate: formattedFirstDate,
  //         endDate: formattedEndDate,
  //       });
  
  //     }
  
  
  
  
  
  //     res.json({ message: "Success", data: results, success: true });
  //   } catch (error) {
  //     console.log("error", error);
  //     res.json({ message: "Error", error: error.message, success: false });
  //   }
  // };
  
  
  
  // ---------------------------------Course Management-----------------------------------------------
  
  
  
  
  
  // const tnaEvaluation = async (req, res) => {
  //   const comp_id = req.params.comp_id;
  
  //   if (!comp_id) {
  //     return res.json({ message: "Company ID is not given", success: false });
  //   }
  
  //   // Check if the company exists
  //   let q = "SELECT emp_id FROM lms_TNA_Employee_Answers WHERE comp_id = ?";
  //   connection.query(q, [comp_id], (err, resp1) => {
  //     if (err) {
  //       return res.json({
  //         message: "Error getting company data",
  //         success: false,
  //       });
  //     } else {
  //       if (resp1?.length <= 0) {
  //         return res.json({ message: "This company's employees haven't submitted tna", success: false });
  //       } else {
  //         // If the company exists, proceed to query employee data
  //         const employeeDataPromises = resp1.map((row) => {
  //           return new Promise((resolve, reject) => {
  //             const sql = "SELECT id, emp_name, emp_email, tna_link FROM lms_employee WHERE id = ?";
  //             connection.query(sql, [row.emp_id], (err, resp2) => {
  //               if (err) {
  //                 console.log(err);
  //                 reject(err);
  //               } else {
  //                 resolve(resp2[0]); // Return only the first element of the array
  //               }
  //             });
  //           });
  //         });
  
  //         Promise.all(employeeDataPromises)
  //           .then((employeeData) => {
  //             return res.json({ message: "Success", data: employeeData, success: true });
  //           })
  //           .catch((error) => {
  //             return res.json({ message: "Failed", error: error, success: false });
  //           });
  //       }
  //     }
  //   });
  // };
  
  
  
  const startDateAndEndDateOfCourseCompany = async (req, res) => {
    try {
      const companies = req.body.comp_names; // Assuming companies is an array of objects with companyId and companyName
  
      if (!companies || companies?.length === 0) {
        return res.json({ message: "Not having enough data", success: false });
      }
  
      const results = [];
      let processedCount = 0;
  
      // Iterate through each company object
      for (const company of companies) {
        const sql =
          "SELECT MIN(date) as startDate, MAX(date) as endDate FROM trialEvents WHERE comp_id = ?";
        connection.query(sql, [company.companyId], (err, resp) => {
          if (err) {
            console.log("err", err);
            return res.json({message: "Fatal error",error: err,success: false,});
          }
  
          if (resp?.length > 0) {
            const { startDate } = resp[0];
            const nDate = JSON.parse(startDate);
  
            // Check if nDate is an array
            if (Array.isArray(nDate)) {
              // Sort the event dates in ascending order
              const sortedArray = nDate.sort((a, b) => new Date(a) - new Date(b));
              const firstDate = new Date(sortedArray[0]);
              const endDate = new Date(sortedArray[sortedArray?.length - 1]);
  
              // Increment the first date by one day
              const increasedFirstDate = new Date(firstDate);
              increasedFirstDate.setDate(increasedFirstDate.getDate());
  
              // Format the dates as dd-mm-yy
              const formattedFirstDate = increasedFirstDate.toLocaleDateString("en-GB");
              const formattedEndDate = endDate.toLocaleDateString("en-GB");
  
              results.push({
                companyId: company.companyId,
                companyName: company.companyName,
                firstDate: formattedFirstDate,
                endDate: formattedEndDate,
              });
            } else {
              // Handle the case where startDate is not an array
              results.push({
                companyId: company.companyId,
                companyName: company.companyName,
                firstDate: null,
                endDate: null,
              });
            }
          } else {
            // If no records are found for the company, you can handle it accordingly
            results.push({
              companyId: company.companyId,
              companyName: company.companyName,
              firstDate: null,
              endDate: null,
            });
          }
  
          // Increment the processedCount
          processedCount++;
  
          // If all companies are processed, send the results back
          if (processedCount === companies?.length) {
            res.json({ message: "Success", data: results, success: true });
          }
        });
      }
    } catch (error) {
      console.log("error", error);
      res.json({ message: "Error", error: error.message, success: false });
    }
  };
  

module.exports = {calendarEvents,getCalendarEvents,getCalendarFutureEvents,updatedDateData,updatedCompData,setEvent,startDateAndEndDateOfCourseCompany}