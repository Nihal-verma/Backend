CREATE TABLE Role (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role VARCHAR(255) NOT NULL,
    status BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)


-- lms_QuestionCategory Model
CREATE TABLE lms_QuestionCategory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(255) NOT NULL,
    status BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- lms calendar events Model
CREATE TABLE trialEvents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    date VARCHAR(5000),
    eventType VARCHAR(255)
);

-- lms CompanyDetails events Model
CREATE TABLE lms_companyDetails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    comp_name VARCHAR(255) NOT NULL,
    id_number VARCHAR(255),
    comp_address VARCHAR(5000),
    comp_phone VARCHAR(255),
    comp_email VARCHAR(255),
    comp_city VARCHAR(255),
    comp_street VARCHAR(255),
    comp_state VARCHAR(255),
    comp_zipcode VARCHAR(255),
    comp_region VARCHAR(255),
    role_Id INT,
    admin_name VARCHAR(255),
    admin_email VARCHAR(255),
    admin_password VARCHAR(255),
    token VARCHAR(255),
    admin_contact_number VARCHAR(255),
    certification_needed BOOLEAN,
    tna_license_code VARCHAR(255),
    no_of_tna INT,
    no_of_course INT,
    course_code VARCHAR(255),
    status BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_Id) REFERENCES Role(id)
);

-- lms_CourseCategory events Model
CREATE TABLE lms_CourseCategory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_name VARCHAR(255) NOT NULL,
    course_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status BOOLEAN NOT NULL DEFAULT TRUE
);

-- lms_CourseCompany events Model
CREATE TABLE lms_CourseCompany (
    id INT PRIMARY KEY AUTO_INCREMENT,
    comp_id INT,
    total_no_of_attendies INT,
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    course_code VARCHAR(50),
    sub_total DECIMAL(10, 2),
    free_evaluation BOOLEAN,
    discount DECIMAL(5, 2),
    grand_total DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (comp_id) REFERENCES lms_companyDetails(id)
);



-- --------------------------lms course Employee table
CREATE TABLE lms_courseEmployee (
    id INT PRIMARY KEY AUTO_INCREMENT,
    comp_id INT NOT NULL,
    emp_id INT NOT NULL,
    emp_name VARCHAR(255) NOT NULL,
    emp_email VARCHAR(255) NOT NULL,
    emp_contact VARCHAR(15),
    designation VARCHAR(100),
    courseToken VARCHAR(255),
    course_code VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    tna_score DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status ENUM('active', 'inactive') DEFAULT 'active'
);

--------------------------lms course graded assessment ---------------------------

CREATE TABLE lms_CourseGradedAssessmentMCQ (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    category_id INT NOT NULL,
    category VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    questions TEXT NOT NULL,
    options TEXT NOT NULL,
    correctAnswer VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


----------------------------------------------lms_CourseModule--------------------
CREATE TABLE lms_CourseModule (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    module_name VARCHAR(255) NOT NULL,
    module_description TEXT,
    number_of_videos INT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES lms_Course(course_id)
);


-----------------------------------------lms_CourseNonGradedAnswerByEmployee-------------------------

CREATE TABLE lms_CourseNonGradedAnswerByEmployee (
    id INT PRIMARY KEY AUTO_INCREMENT,
    emp_id INT NOT NULL,
    course_id INT NOT NULL,
    module_id INT NOT NULL,
    questions TEXT NOT NULL,
    options TEXT,
    correctAnswer TEXT,
    selectedAnswer TEXT,
    score INT,
    out_off INT,
    attempt INT,
    status ENUM('completed', 'in-progress', 'not-started') DEFAULT 'not-started',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (emp_id) REFERENCES lms_courseEmployee(id),
    FOREIGN KEY (course_id) REFERENCES lms_Course(course_id),
    FOREIGN KEY (module_id) REFERENCES lms_CourseModule(id)
);

-----------------------------------------------lms_CourseNonGradedAssessment--------------------
CREATE TABLE lms_CourseNonGradedAssessment (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    module_id INT NOT NULL,
    category VARCHAR(255),
    category_id INT,
    questions TEXT NOT NULL,
    options TEXT,
    correctAnswer TEXT,
    selectedAnswer TEXT,
    status ENUM('completed', 'in-progress', 'not-started') DEFAULT 'not-started',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES lms_Course(course_id),
    FOREIGN KEY (module_id) REFERENCES lms_CourseModule(id)
);


--------------------------------------------lms_CourseVideo--------------------------------
CREATE TABLE lms_CourseVideo (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    module_id INT NOT NULL,
    video VARCHAR(255) NOT NULL,
    video_description TEXT,
    duration TIME,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES lms_Course(course_id),
    FOREIGN KEY (module_id) REFERENCES lms_CourseModule(id)
);


-------------------------------------------------lms_EmailAndTextQuestions---------------
CREATE TABLE lms_EmailAndTextQuestions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category VARCHAR(255) NOT NULL,
    category_id INT NOT NULL,
    topic VARCHAR(255),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-----------------------------------------------lms_GradedAssementOtherQuestions-------------------
CREATE TABLE lms_GradedAssementOtherQuestions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    category VARCHAR(255) NOT NULL,
    category_id INT NOT NULL,
    topic VARCHAR(255),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES YourCourseTable(course_id),
    FOREIGN KEY (category_id) REFERENCES YourCategoryTable(category_id)
);

----------------------------------------------lms_GradedAssesmentAnswersByEmployee--------------------
CREATE TABLE lms_GradedAssesmentAnswersByEmployee (
    id INT PRIMARY KEY AUTO_INCREMENT,
    comp_id INT NOT NULL,
    course_id INT NOT NULL,
    emp_id INT NOT NULL,
    mcq_id INT NOT NULL,
    mcq_questions TEXT NOT NULL,
    mcq_options TEXT NOT NULL,
    mcq_correctAnswer TEXT NOT NULL,
    mcq_selectedAnswer TEXT,
    mcq_score DECIMAL(5,2),
    mcq_score_outOff DECIMAL(5,2),
    text_question TEXT,
    text_answer TEXT,
    text_score DECIMAL(5,2),
    text_score_outOff DECIMAL(5,2),
    email_question TEXT,
    email_answer TEXT,
    email_score DECIMAL(5,2),
    email_score_outOff DECIMAL(5,2),
    total_score DECIMAL(5,2),
    out_off DECIMAL(5,2),
    attempt INT,
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (comp_id) REFERENCES lms_companyDetails(id),
    FOREIGN KEY (course_id) REFERENCES YourCourseTable(course_id),
    FOREIGN KEY (emp_id) REFERENCES YourEmployeeTable(emp_id),
    FOREIGN KEY (mcq_id) REFERENCES YourMCQTable(mcq_id)
);


----------------------------------------lms_TNA_Employee_Answers-----------------------------
CREATE TABLE lms_TNA_Employee_Answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    comp_id INT NOT NULL,
    emp_id INT NOT NULL,
    mcq_questions TEXT,
    mcq_options TEXT,
    mcq_correctAnswer TEXT,
    mcq_selectedAnswer TEXT,
    mcq_score DECIMAL(5,2),
    mcq_score_out_off DECIMAL(5,2),
    text_question TEXT,
    text_answer TEXT,
    text_score DECIMAL(5,2),
    text_score_out_off DECIMAL(5,2),
    email_question TEXT,
    email_answer TEXT,
    email_score DECIMAL(5,2),
    email_score_out_off DECIMAL(5,2),
    total_score DECIMAL(5,2),
    out_off DECIMAL(5,2),
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (comp_id) REFERENCES lms_companyDetails(id),
    FOREIGN KEY (emp_id) REFERENCES YourEmployeeTable(emp_id)
);
