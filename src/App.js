import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Typography, TableContainer, Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Topbar from './components/Topbar/Topbar';
import Sidebar from './components/Sidebar/Sidebar';
import MainContent from './components/MainContent/MainContent';
import Chatbot from './components/Chatbot/Chatbot';
import theme from './theme';
import axios from 'axios';
import { AuthProvider } from './auth/AuthContext';
import Login from './components/Login/Login';
import PrivateRoute from './components/PrivateRoute/PrivateRoute';
import AdminPanel from './components/AdminPanel/AdminPanel';

axios.defaults.baseURL = 'https://servitec-backend-62676166363.europe-southwest1.run.app';

// Add request interceptor
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    console.log('Request with token:', token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor
axios.interceptors.response.use(
  response => response,
  error => {
    console.error('Response error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);


function App() {

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);


  const [projectName, setProjectName] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [errorProjects, setErrorProjects] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [elements, setElements] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [errorData, setErrorData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [reportType, setReportType] = useState('excel');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [selectedProjects, setSelectedProjects] = useState([]); // For SideBar filtering
  const [filters, setFilters] = useState({
    invoices: {
      startDate: '',
      endDate: '',
      FileNameKeyword: '',
      folderTypeKeyword: '',
      folderTypeFilters: {  // Add this for invoices
        adicionals: false,
        pressupost: false
      }
    },
    elements: {
      nameKeyword: '',
      invoiceNameKeyword: '',
      invoiceid: '',
      minPrice: '',
      maxPrice: '',
      folderTypeFilters: {  // Make sure this is initialized
        adicionals: false,
        pressupost: false
      }
    },
    projects: {
      client: '',
      size: '',
    },
  });

  // For DataGrid selections
  const [selectedProjectItems, setSelectedProjectItems] = useState([]);
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState([]);
  const [selectedElementItems, setSelectedElementItems] = useState([]);

  // Log each update in selection states
  useEffect(() => {
    console.log("Selected Invoices updated:", selectedInvoiceItems);
  }, [selectedInvoiceItems]);

  useEffect(() => {
    console.log("Selected Elements updated:", selectedElementItems);
  }, [selectedElementItems]);

  useEffect(() => {
    console.log("Selected Projects updated:", selectedProjectItems);
  }, [selectedProjectItems]);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  useEffect(() => {
    console.log('Starting initial projects fetch...');
    setLoadingProjects(true);
    
    axios.get('/api/projects')
      .then(response => {
        console.log('Projects API Response:', response);
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
        
        const fetchedProjects = response.data.map((project) => {
          console.log('Processing project:', project);
          return {
            id: project.id,
            name: project.name,
            client: project.client,
            autonomousCommunity: project.autonomous_community,
            sizeOfConstruction: project.size_of_construction,
            constructionType: project.construction_type,
            numberOfFloors: project.number_of_floors,
            groundQualityStudy: project.ground_quality_study,
            endState: project.end_state,
          };
        });
        
        console.log('Processed projects:', fetchedProjects);
        setProjects(fetchedProjects);
        setLoadingProjects(false);
      })
      .catch(error => {
        console.error('Projects fetch error details:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          config: error.config
        });
        setErrorProjects('Failed to fetch projects.');
        setLoadingProjects(false);
      });
  }, []);

  useEffect(() => {
    console.log('Data fetch effect triggered');
    console.log('Current tab:', activeTab);
    console.log('Selected projects:', selectedProjects);
    console.log('Current filters:', filters);
    
    setLoadingData(true);
    setErrorData(null);

    const fetchData = async (endpoint) => {
      try {
        let urls = [];
        const endpointFilters = filters[endpoint] || {};
        
        console.log(`Building URLs for ${endpoint} with filters:`, endpointFilters);
        
        if (selectedProjects.length > 0) {
          urls = selectedProjects.map((project) => {
            let url = `/api/${endpoint}/${encodeURIComponent(project)}`;
            const params = { ...endpointFilters };
            const queryString = new URLSearchParams(params).toString();
            if (queryString) {
              url += `?${queryString}`;
            }
            return url;
          });
        } else {
          let url = `/api/${endpoint}`;
          const params = { ...endpointFilters };
          const queryString = new URLSearchParams(params).toString();
          if (queryString) {
            url += `?${queryString}`;
          }
          urls = [url];
        }

        console.log('Making requests to URLs:', urls);

        const responses = await Promise.all(
          urls.map(url => {
            console.log(`Fetching from: ${url}`);
            return axios.get(url)
              .then(response => {
                console.log(`Response from ${url}:`, response);
                return response;
              })
              .catch(error => {
                console.error(`Error fetching ${url}:`, error);
                throw error;
              });
          })
        );

        const data = responses.flatMap((response) => response.data);
        console.log(`${endpoint} data received:`, data);

        // Process data based on endpoint
        if (endpoint === 'invoices') {
          const processedInvoices = data.map((invoice) => ({
            id: invoice.id,
            folder_type: invoice.folder_type,
            file_name: invoice.file_name,
            project_name: invoice.project_name,
          }));
          console.log('Processed invoices:', processedInvoices);
          setInvoices(processedInvoices);
        } else if (endpoint === 'elements') {
          setElements(data.map((element) => ({
            id: element.id,
            units: element.units,
            name: element.name,
            chapter_title: element.chapter_title,
            subchapter_title: element.subchapter_title,
            unit: element.unit,
            quantity: element.quantity,
            price_per_unit: element.price_per_unit,
            discount: element.discount,
            total_price: element.total_price,
            description: element.description,
            has_subelements: element.has_subelements,
            invoice_id: element.invoice_id,
            invoice_name: element.invoice_name,
            folder_type: element.folder_type
          })));
        } else if (endpoint === 'projects') {
          setProjects(data.map((project) => ({
            name: project.name,
            client: project.client,
            autonomousCommunity: project.autonomous_community,
            sizeOfConstruction: project.size_of_construction,
            constructionType: project.construction_type,
            numberOfFloors: project.number_of_floors,
            groundQualityStudy: project.ground_quality_study,
            endState: project.end_state,
          })));
        }
        setLoadingData(false);
      } catch (error) {
        console.error(`Error in fetchData for ${endpoint}:`, {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          config: error.config
        });
        setErrorData(`Failed to fetch ${endpoint}.`);
        setLoadingData(false);
      }
    };

    if (activeTab === 0) {
      console.log('Fetching invoices...');
      fetchData('invoices');
    } else if (activeTab === 1) {
      console.log('Fetching elements...');
      fetchData('elements');
    } else if (activeTab === 2) {
      console.log('Fetching projects...');
      fetchData('projects');
    }
  }, [selectedProjects, activeTab, filters]);

  const SubelementsList = ({ elementId }) => {
    const [subelements, setSubelements] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
      const fetchSubelements = async () => {
        try {
          const response = await axios.get(`/api/subelements/${elementId}`);
          console.log('Fetched subelements:', response.data);
          setSubelements(response.data);
        } catch (error) {
          console.error('Error fetching subelements:', error);
        }
      };
      fetchSubelements();
    }, [elementId]);
    if (loading) {
      return <div>Loading subelements...</div>;
    }
    if (subelements.length === 0) {
      return <Typography>No subelements available.</Typography>;
    }
    return (
      <TableContainer component={Paper}>
        <Table size="small" aria-label="subelements table">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell align="right">N</TableCell>
              <TableCell align="right">Length (L)</TableCell>
              <TableCell align="right">Height (H)</TableCell>
              <TableCell align="right">Width (W)</TableCell>
              <TableCell align="right">Total Price</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subelements.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell component="th" scope="row">{sub.title || '-'}</TableCell>
                <TableCell>{sub.unit || '-'}</TableCell>
                <TableCell align="right">{sub.n || '-'}</TableCell>
                <TableCell align="right">{sub.l || '-'}</TableCell>
                <TableCell align="right">{sub.h || '-'}</TableCell>
                <TableCell align="right">{sub.w || '-'}</TableCell>
                <TableCell align="right">{sub.total_price || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };
  
  const handleProjectSelect = (project) => {
    setProjectName(prevName => prevName === project.name ? '' : project.name);
    setActiveTab(0);
    setElements([]);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // No need to call fetch functions here; useEffect will handle data fetching
  };

  const fetchElements = async () => {
    setLoadingData(true);
    setErrorData(null);
    try {
      let url = '/api/elements';
      if (selectedProjects.length > 0) {
        url += `?projects=${selectedProjects.join(',')}`;
      }
      const response = await axios.get(url);
      const fetchedElements = response.data.map((element) => ({
        id: element.id,
        name: element.name,
        unit: element.unit,
        quantity: element.quantity,
        price_per_unit: element.price_per_unit,
        discount: element.discount,
        total_price: element.total_price,
      }));
      setElements(fetchedElements);
    } catch (error) {
      console.error(error);
      setErrorData('Failed to fetch elements.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleChatToggle = () => setChatOpen(!chatOpen);

  const handleLogin = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      return response.data;
    } catch (error) {
      if (error.response.status === 429) {
        // Rate limited or account locked
        const waitTime = error.response.data.wait_time;
        throw new Error(`Too many attempts. Please wait ${Math.ceil(waitTime / 60)} minutes.`);
      }
      throw error;
    }
  };

  const handleChatSend = () => {
    if (chatInput.trim() === '') return;
    const userMessage = chatInput.trim();
    setChatMessages([...chatMessages, { text: userMessage, sender: 'user' }]);
    setChatInput('');
    setChatLoading(true);
    setChatError(null);
    axios.post('/api/chat', { message: userMessage }, { withCredentials: true })
      .then((response) => {
        const botReply = response.data.reply;
        const format = response.data.format;
        setChatMessages((prevMessages) => [
          ...prevMessages,
          { text: botReply, sender: 'bot' },
        ]);
        setChatLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setChatError('Failed to get response from the chat server.');
        setChatLoading(false);
      });
  };

  const handleProjectToggle = (project) => {
    setSelectedProjects(prevProjects => {
      const newSelectedProjects = prevProjects.includes(project.name)
        ? prevProjects.filter(p => p !== project.name)
        : [...prevProjects, project.name];
      if (activeTab === 1) {
        fetchElements();
      }
      return newSelectedProjects;
    });
  };

  const fetchProjects = async () => {
    setLoadingData(true);
    setErrorData(null);
    try {
      const response = await axios.get('/api/projects');
      const fetchedProjects = response.data.map((project) => ({
        name: project.name,
        client: project.client,
        autonomousCommunity: project.autonomous_community,
        sizeOfConstruction: project.size_of_construction,
        constructionType: project.construction_type,
        numberOfFloors: project.number_of_floors,
        groundQualityStudy: project.ground_quality_study,
        endState: project.end_state,
      }));
      setProjects(fetchedProjects);
    } catch (error) {
      console.error(error);
      setErrorData('Failed to fetch projects.');
    } finally {
      setLoadingData(false);
    }
  };

  const MainAppContent = () => (
    <Box sx={{ display: 'flex' }}>
      <Topbar onMenuClick={handleDrawerToggle} />
      <Sidebar
        projects={projects}
        projectSearch={projectSearch}
        setProjectSearch={setProjectSearch}
        loadingProjects={loadingProjects}
        errorProjects={errorProjects}
        onProjectToggle={handleProjectToggle}
        mobileOpen={mobileOpen}
        onDrawerToggle={handleDrawerToggle}
        selectedProjects={selectedProjects}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - 240px)` },
          ml: { sm: `240px` },
          mt: '48px',
        }}
      >
        <MainContent
          projectName={projectName}
          selectedProjects={selectedProjects}
          invoices={invoices}
          elements={elements}
          projects={projects}
          filters={filters}
          setFilters={setFilters}
          loadingData={loadingData}
          errorData={errorData}
          activeTab={activeTab}
          handleTabChange={handleTabChange}
          selectedInvoiceItems={selectedInvoiceItems}
          setSelectedInvoiceItems={setSelectedInvoiceItems}
          selectedElementItems={selectedElementItems}
          setSelectedElementItems={setSelectedElementItems}
          selectedProjectItems={selectedProjectItems}
          setSelectedProjectItems={setSelectedProjectItems}
        />
      </Box>
      <Chatbot
        chatOpen={chatOpen}
        handleChatToggle={handleChatToggle}
        chatInput={chatInput}
        setChatInput={setChatInput}
        chatMessages={chatMessages}
        handleChatSend={handleChatSend}
        chatLoading={chatLoading}
        chatError={chatError}
      />
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  <AdminPanel />
                </PrivateRoute>
              }
            />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <MainAppContent />
                </PrivateRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;