from threading import Timer
from urllib.error import HTTPError
from nbtools import UIOutput


class GPJobWidget(UIOutput):
    """A widget for representing the status of a GenePattern job"""
    default_color = 'rgba(10, 45, 105, 0.80)'
    job = None

    def __init__(self, job=None, **kwargs):
        """Initialize the job widget"""
        UIOutput.__init__(self, color=self.default_color, **kwargs)
        self.job = job
        self.poll()  # Query the GP server and begin polling, if needed

    def poll(self):
        """Poll the GenePattern server for the job info and display it in the widget"""
        if self.job is not None and self.job.server_data is not None:
            try:  # Attempt to load the job info from the GP server
                self.job.get_info()
            except HTTPError:  # Handle HTTP errors contacting the server
                self.name = 'Error Loading Job'
                self.error = f'Error loading job #{self.job.job_number}'
                return

            # Add the job information to the widget
            self.name = f'Job #{self.job.job_number}'
            self.status = self.status_text()
            self.text = self.submitted_text()
            self.files = self.files_list()
            self.visualization = self.visualizer()

            # Begin polling if pending or running
            self.poll_if_needed()
        else:
            # Display error message if no initialized GPJob object is provided
            self.name = 'Not Authenticated'
            self.error = 'You must be authenticated before the job can be displayed. After you authenticate it may take a few seconds for the information to appear.'

    def visualizer(self):
        if self.job is None: return  # Ensure the job has been set

        # Handle server-relative URLs
        if 'launchUrl' in self.job.info:
            launch_url = self.job.info["launchUrl"]
            if launch_url[0] == '/': launch_url = launch_url[3:]
            return f'{self.job.server_data.url}{launch_url}'

        # Handle index.html or single HTML returns
        single_html = None
        for f in self.files:
            if f.endswith('/index.html'):
                return f
            elif f.endswith('.html') and single_html is None:
                single_html = f
            elif f.endswith('.html') and single_html is not None:
                single_html = False
        if single_html: return single_html

        # Otherwise there is no visualizer
        return ''

    def poll_if_needed(self):
        """Begin a polling interval if the job is pending or running"""
        if self.status == 'Pending' or self.status == 'Running':
            timer = Timer(15.0, lambda: self.poll())
            timer.start()

    def submitted_text(self):
        """Return pretty job submission text"""
        if self.job is None: return  # Ensure the job has been set
        return f'Submitted by {self.job.info["userId"]} on {self.job.date_submitted}'

    def files_list(self):
        """Return the list of output and log files in the format the widget can handle"""
        if self.job is None: return  # Ensure the job has been set
        return [f['link']['href'] for f in (self.job.output_files + self.job.log_files)]

    def status_text(self):
        """Return concise status text"""
        if self.job is None: return ''  # Ensure the job has been set
        if 'hasError' in self.job.info['status'] and self.job.info['status']['hasError']:
            return 'Error'
        elif 'completedInGp' in self.job.info['status'] and self.job.info['status']['completedInGp']:
            return 'Completed'
        elif 'isPending' in self.job.info['status'] and self.job.info['status']['isPending']:
            return 'Pending'
        else:
            return 'Running'

# TODO: - Job sharing
#       - Send to code
#       - Send to Dataframe
#       - Pop out visualizer
#       - Child jobs
